"""
Verification router — handles:
  - GET  /api/verification/status           current user's verification status
  - POST /api/verification/start-manual     submit ID + selfie for manual review
  - GET  /api/verification/requests         admin: pending queue
  - GET  /api/verification/requests/{user_id}/photo  admin: review a photo
  - POST /api/verification/requests/{user_id}/approve  admin
  - POST /api/verification/requests/{user_id}/reject   admin

Manual review, no bots: photos wait on our own disk until decision, then are
deleted. The DB keeps only the submitted name, the ID photo hash (same
document on two accounts lights up as a duplicate), and who approved.
"""
from __future__ import annotations

import hashlib
import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from db import get_conn, fetchone, fetchall
from routers.auth import get_current_user, require_admin

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
REVIEW_DIR = os.path.join(DATA_DIR, "verification")
os.makedirs(REVIEW_DIR, exist_ok=True)

# Documents need detail, so the cap is roomier than avatars (2 MB).
MAX_BYTES = 8 * 1024 * 1024
ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}
PHOTO_KINDS = {"id": "id", "selfie": "selfie"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_dir(user_id: str) -> str:
    return os.path.join(REVIEW_DIR, user_id)


def _check_image(name: str, content_type: str | None, data: bytes) -> str:
    ext = (name or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT or not (content_type or "").startswith("image/"):
        raise HTTPException(400, "Verification photos must be JPG, PNG or WebP images")
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(400, "Verification photos must be non-empty and under 8 MB")
    return ext


def _photo_path(user_id: str, kind: str) -> str | None:
    """Stored file for a pending review, or None when already decided."""
    d = _user_dir(user_id)
    if not os.path.isdir(d):
        return None
    for f in sorted(os.listdir(d)):
        if f.startswith(f"{kind}."):
            return os.path.join(d, f)
    return None


def _clear_photos(user_id: str) -> None:
    shutil.rmtree(_user_dir(user_id), ignore_errors=True)


class RejectIn(BaseModel):
    reason: str | None = None


# ─── User endpoints ───────────────────────────────────────────────────────────

@router.get("/status")
async def get_verification_status(user=Depends(get_current_user)):
    """Return the current user's verification status."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT identity_verified, verification_method FROM profiles"
            " WHERE id = %s",
            (user.id,),
        )
        profile = fetchone(cur)
    if profile and profile.get("identity_verified"):
        return {
            "verified": True,
            "method": profile.get("verification_method"),
            "status": "approved",
        }

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT status, method, rejection_reason FROM verification_requests"
            " WHERE user_id = %s ORDER BY submitted_at DESC LIMIT 1",
            (user.id,),
        )
        req = fetchone(cur)
    if req:
        return {
            "verified": False,
            "method": req.get("method"),
            "status": req.get("status"),
            "rejection_reason": req.get("rejection_reason"),
        }

    return {"verified": False, "method": None, "status": "unverified"}


@router.post("/start-manual")
async def start_manual(
    full_name: str = Form(...),
    id_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Submit a manual verification request. Photos wait on our disk until an
    admin decides, then are deleted. Only the name + ID hash stay in the DB."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT identity_verified FROM profiles WHERE id = %s", (user.id,)
        )
        profile = fetchone(cur)
    if profile and profile.get("identity_verified"):
        raise HTTPException(400, "Already verified")

    id_bytes = await id_photo.read()
    selfie_bytes = await selfie_photo.read()
    id_ext = _check_image(id_photo.filename or "", id_photo.content_type, id_bytes)
    selfie_ext = _check_image(selfie_photo.filename or "", selfie_photo.content_type, selfie_bytes)
    id_hash = hashlib.sha256(id_bytes).hexdigest()

    # Fixed names per user: resubmit replaces the waiting photos.
    d = _user_dir(user.id)
    os.makedirs(d, exist_ok=True)
    for stale in os.listdir(d):
        if stale.startswith("id.") or stale.startswith("selfie."):
            os.remove(os.path.join(d, stale))
    with open(os.path.join(d, f"id.{id_ext}"), "wb") as f:
        f.write(id_bytes)
    with open(os.path.join(d, f"selfie.{selfie_ext}"), "wb") as f:
        f.write(selfie_bytes)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM verification_requests WHERE user_id = %s"
            " AND method = 'manual' AND status = 'pending'",
            (user.id,),
        )
        cur.execute(
            "INSERT INTO verification_requests (user_id, method, status, verified_name, id_photo_sha256)"
            " VALUES (%s, 'manual', 'pending', %s, %s)",
            (user.id, full_name, id_hash),
        )

    return {"ok": True, "status": "pending"}


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@router.get("/requests")
async def list_requests(admin=Depends(require_admin)):
    """Pending queue, oldest first. Blind by construction: the response
    carries request IDs only, never accounts. The submitted name stays
    because comparing it against the ID document is the review itself."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, verified_name, submitted_at, id_photo_sha256"
            " FROM verification_requests"
            " WHERE method = 'manual' AND status = 'pending'"
            " ORDER BY submitted_at ASC"
        )
        rows = fetchall(cur)
        out = []
        for r in rows:
            dup = 0
            if r.get("id_photo_sha256"):
                cur.execute(
                    "SELECT COUNT(DISTINCT user_id) FROM verification_requests"
                    " WHERE id_photo_sha256 = %s",
                    (r["id_photo_sha256"],),
                )
                dup = (fetchone(cur) or {}).get("count", 0) - 1
            out.append({
                "id": str(r["id"]),
                "verified_name": r.get("verified_name"),
                "submitted_at": r.get("submitted_at"),
                "duplicates": max(dup, 0),
            })
        return out


def _pending_user(request_id: str) -> str:
    """Resolve a pending request to its owner, or 404. The only place a
    request ID touches an account."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM verification_requests WHERE id = %s"
            " AND method = 'manual' AND status = 'pending'",
            (request_id,),
        )
        row = fetchone(cur)
    if not row:
        raise HTTPException(404, "No pending request with this id")
    return str(row["user_id"])


@router.get("/requests/{request_id}/photo")
async def review_photo(request_id: str, kind: str = "id", admin=Depends(require_admin)):
    """Serve one waiting photo to the admin. Nothing here is public."""
    if kind not in PHOTO_KINDS:
        raise HTTPException(400, "kind must be id or selfie")
    path = _photo_path(_pending_user(request_id), PHOTO_KINDS[kind])
    if not path:
        raise HTTPException(404, "No waiting photos for this request")
    ext = path.rsplit(".", 1)[-1].lower()
    media = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    return FileResponse(path, media_type=media)


@router.post("/requests/{request_id}/approve")
async def approve_request(request_id: str, admin=Depends(require_admin)):
    user_id = _pending_user(request_id)
    now = _now()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE profiles SET identity_verified = TRUE,"
            " verification_method = 'manual' WHERE id = %s",
            (user_id,),
        )
        cur.execute(
            "UPDATE verification_requests SET status = 'approved',"
            " reviewed_at = %s, reviewed_by = %s WHERE id = %s",
            (now, admin.id, request_id),
        )
    _clear_photos(user_id)
    return {"ok": True, "status": "approved"}


@router.post("/requests/{request_id}/reject")
async def reject_request(request_id: str, body: RejectIn, admin=Depends(require_admin)):
    user_id = _pending_user(request_id)
    now = _now()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE verification_requests SET status = 'rejected',"
            " reviewed_at = %s, reviewed_by = %s, rejection_reason = %s"
            " WHERE id = %s",
            (now, admin.id, (body.reason or "").strip() or "Rejected by admin", request_id),
        )
    _clear_photos(user_id)
    return {"ok": True, "status": "rejected"}
