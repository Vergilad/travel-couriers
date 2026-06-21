from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user

router = APIRouter()

@router.post("")
async def create_or_get_thread(listing_id: str, user=Depends(get_current_user)):
    # Get listing to find owner
    listing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
    if not listing.data:
        raise HTTPException(404, "Listing not found")
    owner_id = listing.data["owner_id"]
    if owner_id == user.id:
        raise HTTPException(400, "Cannot contact your own listing")
    # Check if thread already exists for this listing + these two users
    existing_participations = supabase.table("thread_participants").select("thread_id").eq("user_id", user.id).execute()
    if existing_participations.data:
        thread_ids = [p["thread_id"] for p in existing_participations.data]
        for tid in thread_ids:
            thread = supabase.table("threads").select("*").eq("id", tid).eq("listing_id", listing_id).execute()
            if thread.data:
                return thread.data[0]
    # Create new thread
    thread = supabase.table("threads").insert({"listing_id": listing_id}).execute()
    thread_id = thread.data[0]["id"]
    supabase.table("thread_participants").insert([
        {"thread_id": thread_id, "user_id": user.id},
        {"thread_id": thread_id, "user_id": owner_id}
    ]).execute()
    return thread.data[0]

@router.get("")
async def list_threads(user=Depends(get_current_user)):
    participations = supabase.table("thread_participants").select("thread_id").eq("user_id", user.id).execute()
    if not participations.data:
        return []
    thread_ids = [p["thread_id"] for p in participations.data]
    threads = supabase.table("threads").select("*").in_("id", thread_ids).execute()
    return threads.data