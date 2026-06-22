from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ProfileUpdate
from routers.auth import get_current_user

router = APIRouter()

@router.get("/me")
async def get_my_profile(user=Depends(get_current_user)):
    result = supabase.table("profiles").select(
        "id, display_name, avatar_url, bio, city, country, created_at"
    ).eq("id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Profile not found")
    return result.data

@router.patch("/me")
async def update_my_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = supabase.table("profiles").update(updates).eq("id", user.id).execute()
    return result.data[0]

@router.get("/{user_id}")
async def get_public_profile(user_id: str):
    result = supabase.table("profiles").select(
        "id, display_name, avatar_url, bio, city, country, created_at"
    ).eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Profile not found")
    return result.data

@router.get("/{user_id}/listings")
async def get_profile_listings(user_id: str):
    result = supabase.table("listings").select("*").eq(
        "owner_id", user_id
    ).eq("status", "open").order("created_at", desc=True).execute()
    return result.data