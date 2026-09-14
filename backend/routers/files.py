"""Local avatar files. Replaces the Supabase storage bucket.

Upload is authenticated and validated (type + size); reads are public,
same rule the old bucket policy enforced. Files live under data/ so a
single compose volume persists them on any host.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles

from db import get_conn, fetchone
from routers.auth import get_current_user

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
AVATAR_DIR = os.path.join(DATA_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

MAX_BYTES = 2 * 1024 * 1024
ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}


def files_app():
    return StaticFiles(directory=DATA_DIR)


@router.post("/avatars")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT or not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Avatar must be a JPG, PNG or WebP image")
    data = await file.read()
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(400, "Avatar must be non-empty and under 2 MB")

    user_dir = os.path.join(AVATAR_DIR, user.id)
    os.makedirs(user_dir, exist_ok=True)
    # Fixed name per user: re-upload replaces. Remove a stale other-format file.
    for stale in os.listdir(user_dir):
        if stale.startswith("avatar."):
            os.remove(os.path.join(user_dir, stale))
    with open(os.path.join(user_dir, f"avatar.{ext}"), "wb") as f:
        f.write(data)

    avatar_url = f"/files/avatars/{user.id}/avatar.{ext}"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE profiles SET avatar_url = %s WHERE id = %s RETURNING avatar_url",
            (avatar_url, user.id),
        )
        row = fetchone(cur)
    return {"avatar_url": row["avatar_url"] if row else avatar_url}
