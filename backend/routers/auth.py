"""Auth: dependency + email/password endpoints, all owned by FastAPI.

Tokens: short access JWT (HS256, 15 min) + rotating opaque refresh
tokens (sha256-hashed in DB, 30 days). Signup creates users + profiles
rows in one transaction — no DB triggers.
"""
import hashlib
import os
import re
import secrets
import shutil
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, field_validator

from db import get_conn
from rate_limit import check_rate_limit

router = APIRouter()

ACCESS_MINUTES = 15
REFRESH_DAYS = 30
MIN_PASSWORD = 8

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _secret() -> str:
    secret = os.environ.get("AUTH_JWT_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(503, "AUTH_JWT_SECRET not configured")
    return secret


def _access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user_id, "exp": now + timedelta(minutes=ACCESS_MINUTES)},
        _secret(),
        algorithm="HS256",
    )


def _new_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    return raw, hashlib.sha256(raw.encode()).hexdigest()


def _store_refresh(user_id: str) -> str:
    raw, digest = _new_refresh_token()
    expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO refresh_tokens (token_sha256, user_id, expires_at)"
            " VALUES (%s, %s, %s)",
            (digest, user_id, expires),
        )
    return raw


def _pair(user_id: str) -> dict:
    return {"access_token": _access_token(user_id),
            "refresh_token": _store_refresh(user_id),
            "token_type": "bearer"}


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return SimpleNamespace(id=str(row["id"]), email=row["email"])


async def get_optional_user(authorization: str = Header(default=None)):
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


async def require_admin(user=Depends(get_current_user)):
    """Admin-only gate backed by the user_roles table (grant with psql)."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM user_roles WHERE user_id = %s AND role = 'admin'",
            (user.id,),
        )
        if not cur.fetchone():
            raise HTTPException(403, "Admin only")
    return user


class SignupIn(BaseModel):
    email: str
    password: str
    display_name: str | None = None

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        v = (v or "").strip().lower()
        if not _EMAIL.match(v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("password")
    @classmethod
    def strong_enough(cls, v):
        if len(v or "") < MIN_PASSWORD:
            raise ValueError(f"Password must be at least {MIN_PASSWORD} characters")
        return v


class SigninIn(BaseModel):
    email: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class PasswordIn(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_enough(cls, v):
        if len(v or "") < MIN_PASSWORD:
            raise ValueError(f"Password must be at least {MIN_PASSWORD} characters")
        return v


@router.post("/signup", status_code=201)
async def signup(body: SignupIn, request: Request):
    check_rate_limit(request, "signup")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(409, "Email already registered")
        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s)"
            " RETURNING id, email",
            (body.email, pwd.hash(body.password)),
        )
        user = cur.fetchone()
        display = (body.display_name or "").strip() or body.email.split("@")[0]
        cur.execute(
            "INSERT INTO profiles (id, display_name) VALUES (%s, %s)",
            (user["id"], display),
        )
    pair = _pair(str(user["id"]))
    return {"id": str(user["id"]), "email": user["email"], **pair}


@router.post("/signin")
async def signin(body: SigninIn, request: Request):
    check_rate_limit(request, "signin")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, password_hash FROM users WHERE email = %s",
            ((body.email or "").strip().lower(),),
        )
        user = cur.fetchone()
    if not user or not pwd.verify(body.password or "", user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    pair = _pair(str(user["id"]))
    return {"id": str(user["id"]), "email": user["email"], **pair}


@router.post("/refresh")
async def refresh(body: RefreshIn, request: Request):
    # Wide bucket on purpose: tokens are unguessable, and a 429 here would
    # read as a dead session to the client. This is DoS cover, not guessing.
    check_rate_limit(request, "refresh", max_hits=30)
    digest = hashlib.sha256((body.refresh_token or "").encode()).hexdigest()
    now = datetime.now(timezone.utc)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM refresh_tokens WHERE token_sha256 = %s"
            " RETURNING user_id, expires_at",
            (digest,),
        )
        row = cur.fetchone()
    if not row or row["expires_at"] < now:
        raise HTTPException(401, "Invalid or expired refresh token")
    return _pair(str(row["user_id"]))


@router.post("/signout")
async def signout(body: RefreshIn, user=Depends(get_current_user)):
    digest = hashlib.sha256((body.refresh_token or "").encode()).hexdigest()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM refresh_tokens WHERE token_sha256 = %s AND user_id = %s",
            (digest, user.id),
        )
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM user_roles WHERE user_id = %s AND role = 'admin'",
            (user.id,),
        )
        is_admin = bool(cur.fetchone())
    return {"id": user.id, "email": user.email, "is_admin": is_admin}


@router.patch("/password")
async def change_password(body: PasswordIn, user=Depends(get_current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT password_hash FROM users WHERE id = %s", (user.id,))
        row = cur.fetchone()
        if not row or not pwd.verify(body.old_password or "", row["password_hash"]):
            raise HTTPException(401, "Current password is incorrect")
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (pwd.hash(body.new_password), user.id),
        )
    return {"ok": True}


@router.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    """Self-serve account deletion. Removes the user row (cascades profile,
    refresh tokens, listings, threads, reviews, reports) plus the rows with
    no FK back to users (completed_deals snapshots, delivery rows) and the
    user's files. The other party's copy of a shared deal goes with it:
    deletion means forgotten, not archived."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM completed_deals WHERE user_a = %s OR user_b = %s",
            (user.id, user.id),
        )
        cur.execute(
            "DELETE FROM delivery_confirmations"
            " WHERE courier_id = %s OR recipient_id = %s",
            (user.id, user.id),
        )
        cur.execute("DELETE FROM listings WHERE owner_id = %s", (user.id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user.id,))

    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    for folder in ("avatars", "verification"):
        try:
            shutil.rmtree(os.path.join(data_dir, folder, user.id), ignore_errors=True)
        except Exception:
            pass
    return {"ok": True}
