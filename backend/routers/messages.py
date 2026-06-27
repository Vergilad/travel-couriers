from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from db import supabase
from models import MessageCreate
from routers.auth import get_current_user

router = APIRouter()


def _guard():
    if not supabase:
        raise HTTPException(503, "Database not configured")


def _assert_participant(thread_id: str, user_id: str):
    check = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(403, "Not a participant in this thread")


@router.get("/{thread_id}")
async def get_messages(thread_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        result = supabase.table("messages").select("*").eq("thread_id", thread_id).order("created_at").execute()
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch messages: {str(e)}")


@router.post("")
async def send_message(body: MessageCreate, user=Depends(get_current_user)):
    _guard()
    try:
        _assert_participant(body.thread_id, user.id)
        text = body.body.strip()
        if not text:
            raise HTTPException(400, "Message body cannot be empty")
        result = supabase.table("messages").insert({
            "thread_id": body.thread_id,
            "sender_id": user.id,
            "body": text,
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to send message: {str(e)}")


@router.patch("/thread/{thread_id}/read")
async def mark_thread_read(thread_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("messages").update({"read_at": now}).eq("thread_id", thread_id).neq("sender_id", user.id).is_("read_at", "null").execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to mark as read: {str(e)}")
