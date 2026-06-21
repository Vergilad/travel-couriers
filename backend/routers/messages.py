from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import MessageCreate
from routers.auth import get_current_user

router = APIRouter()

def _assert_participant(thread_id: str, user_id: str):
    check = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(403, "Not a participant in this thread")

@router.get("/{thread_id}")
async def get_messages(thread_id: str, user=Depends(get_current_user)):
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
    try:
        _assert_participant(body.thread_id, user.id)
        result = supabase.table("messages").insert({
            "thread_id": body.thread_id,
            "sender_id": user.id,
            "body": body.body
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to send message: {str(e)}")