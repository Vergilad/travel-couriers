from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user

router = APIRouter()

@router.post("/confirm")
async def confirm_match(thread_id: str, user=Depends(get_current_user)):
    # Verify user is a participant
    check = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).eq("user_id", user.id).execute()
    if not check.data:
        raise HTTPException(403, "Not a participant")
    # Insert confirmation (unique constraint prevents duplicates)
    try:
        supabase.table("match_confirmations").insert({
            "thread_id": thread_id,
            "user_id": user.id
        }).execute()
    except Exception:
        raise HTTPException(400, "Already confirmed")
    # Check if both parties confirmed
    confirmations = supabase.table("match_confirmations").select("user_id").eq("thread_id", thread_id).execute()
    participants = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).execute()
    if len(confirmations.data) == len(participants.data):
        return {"status": "matched", "message": "Both parties confirmed — listing is now matched"}
    return {"status": "waiting", "message": "Waiting for the other party to confirm"}