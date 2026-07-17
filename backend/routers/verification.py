"""
Verification router — handles:
  - GET  /api/verification/status           current user's verification status
  - POST /api/verification/start-manual     submit ID + selfie for manual review
  - POST /api/verification/bot-webhook      Telegram bot webhook (admin approve/reject)
  - POST /api/verification/setup-webhook    one-time helper to register the bot webhook URL
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse

from db import supabase
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Config ──────────────────────────────────────────────────────────────────

def _bot_token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "")

def _admin_chat() -> str:
    return os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")

def _webhook_secret() -> str:
    return os.getenv("TELEGRAM_WEBHOOK_SECRET", "")

def _tg(path: str) -> str:
    return f"https://api.telegram.org/bot{_bot_token()}/{path}"

def _guard():
    if not supabase:
        raise HTTPException(503, "Database not configured")

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_verification_status(user=Depends(get_current_user)):
    """Return the current user's verification status."""
    _guard()
    profile = (
        supabase.table("profiles")
        .select("identity_verified, verification_method")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )
    if profile.data and profile.data.get("identity_verified"):
        return {
            "verified": True,
            "method": profile.data.get("verification_method"),
            "status": "approved",
        }

    req = (
        supabase.table("verification_requests")
        .select("status, method, rejection_reason")
        .eq("user_id", user.id)
        .order("submitted_at", desc=True)
        .limit(1)
        .execute()
    )
    if req.data:
        r = req.data[0]
        return {
            "verified": False,
            "method": r.get("method"),
            "status": r.get("status"),
            "rejection_reason": r.get("rejection_reason"),
        }

    return {"verified": False, "method": None, "status": "unverified"}


@router.post("/start-manual")
async def start_manual(
    full_name: str = Form(...),
    id_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Submit a manual verification request: ID photo + selfie with ID.
    Photos are forwarded to the admin's Telegram chat and immediately discarded —
    they are never stored on our servers.
    """
    _guard()

    profile = (
        supabase.table("profiles")
        .select("identity_verified")
        .eq("id", user.id)
        .maybe_single()
        .execute()
    )
    if profile.data and profile.data.get("identity_verified"):
        raise HTTPException(400, "Already verified")

    # Delete any stale pending manual request so the user can re-submit
    supabase.table("verification_requests").delete().eq("user_id", user.id).eq(
        "method", "manual"
    ).eq("status", "pending").execute()

    if not _bot_token() or not _admin_chat():
        raise HTTPException(503, "Verification service not configured — admin credentials missing")

    # Read files into memory (never touch disk)
    id_bytes = await id_photo.read()
    selfie_bytes = await selfie_photo.read()

    user_tag = f"{user.id[:8]}…"
    caption_id = f"ID Document\nUser: {user_tag}\nName submitted: {full_name}"
    caption_selfie = f"Selfie + ID\nUser: {user_tag}"
    action_text = (
        f"📋 Manual Verification Request\n"
        f"Full user ID: {user.id}\n"
        f"Email: {user.email}\n"
        f"Name: {full_name}\n\n"
        f"Tap a button below to approve or reject."
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "Approve", "callback_data": f"approve:{user.id}"},
                {"text": "Reject", "callback_data": f"reject:{user.id}"},
            ]
        ]
    }

    async with httpx.AsyncClient(timeout=30) as client:
        await client.post(
            _tg("sendPhoto"),
            data={"chat_id": _admin_chat(), "caption": caption_id},
            files={"photo": (id_photo.filename or "id.jpg", id_bytes, id_photo.content_type or "image/jpeg")},
        )
        await client.post(
            _tg("sendPhoto"),
            data={"chat_id": _admin_chat(), "caption": caption_selfie},
            files={"photo": (selfie_photo.filename or "selfie.jpg", selfie_bytes, selfie_photo.content_type or "image/jpeg")},
        )
        await client.post(
            _tg("sendMessage"),
            json={"chat_id": _admin_chat(), "text": action_text, "reply_markup": keyboard},
        )

    # Store the pending request (photos are NOT stored — only the name)
    supabase.table("verification_requests").insert(
        {
            "user_id": user.id,
            "method": "manual",
            "status": "pending",
            "verified_name": full_name,
        }
    ).execute()

    return {"ok": True, "status": "pending"}


# ─── Telegram bot webhook ─────────────────────────────────────────────────────

@router.post("/bot-webhook")
async def bot_webhook(request: Request):
    """Telegram bot webhook — receives admin approve/reject button callbacks."""
    secret = _webhook_secret()
    if secret:
        incoming = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if incoming != secret:
            return JSONResponse({"ok": False}, status_code=403)

    try:
        update = await request.json()
    except Exception:
        return JSONResponse({"ok": True})

    if "callback_query" in update:
        await _handle_callback_query(update["callback_query"])

    return JSONResponse({"ok": True})


async def _handle_callback_query(cq: dict):
    """Admin taps Approve / Reject on a manual verification request."""
    if not supabase:
        return

    data = cq.get("data", "")
    cq_id = cq.get("id", "")
    chat_id = cq.get("message", {}).get("chat", {}).get("id")
    message_id = cq.get("message", {}).get("message_id")

    if not (data.startswith("approve:") or data.startswith("reject:")):
        return

    action, user_id = data.split(":", 1)
    is_approve = action == "approve"
    now = _now()

    if is_approve:
        supabase.table("profiles").update(
            {"identity_verified": True, "verification_method": "manual"}
        ).eq("id", user_id).execute()
        supabase.table("verification_requests").update(
            {"status": "approved", "reviewed_at": now}
        ).eq("user_id", user_id).eq("method", "manual").eq("status", "pending").execute()
        answer_text = "User approved"
        status_label = "APPROVED"
    else:
        supabase.table("verification_requests").update(
            {"status": "rejected", "reviewed_at": now, "rejection_reason": "Rejected by admin"}
        ).eq("user_id", user_id).eq("method", "manual").eq("status", "pending").execute()
        answer_text = "User rejected"
        status_label = "REJECTED"

    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(_tg("answerCallbackQuery"), json={"callback_query_id": cq_id, "text": answer_text})
        if chat_id and message_id:
            await client.post(
                _tg("editMessageReplyMarkup"),
                json={"chat_id": chat_id, "message_id": message_id, "reply_markup": {"inline_keyboard": []}},
            )
            await client.post(
                _tg("sendMessage"),
                json={"chat_id": chat_id, "text": f"{status_label} — user `{user_id[:8]}…`", "parse_mode": "Markdown"},
            )


# ─── One-time webhook setup helper ────────────────────────────────────────────

@router.post("/setup-webhook")
async def setup_webhook(webhook_url: str, user=Depends(get_current_user)):
    """Register the Telegram bot webhook. Call once after deployment."""
    if not _bot_token():
        raise HTTPException(503, "TELEGRAM_BOT_TOKEN not set")

    full_url = f"{webhook_url.rstrip('/')}/api/verification/bot-webhook"
    payload: dict = {"url": full_url, "allowed_updates": ["callback_query"]}
    secret = _webhook_secret()
    if secret:
        payload["secret_token"] = secret

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(_tg("setWebhook"), json=payload)
        result = r.json()

    if not result.get("ok"):
        raise HTTPException(500, f"Telegram error: {result.get('description', 'unknown')}")

    return {"ok": True, "webhook_url": full_url}
