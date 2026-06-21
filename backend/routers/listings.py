from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ListingCreate
from routers.auth import get_current_user

router = APIRouter()

@router.get("")
async def browse_listings(
    kind: str = None,
    origin_city: str = None,
    dest_city: str = None,
    status: str = "open",
    order_by: str = "created_at"
):
    query = supabase.table("listings").select("*").eq("status", status)
    if kind:
        query = query.eq("kind", kind)
    if origin_city:
        query = query.ilike("origin_city", f"%{origin_city}%")
    if dest_city:
        query = query.ilike("dest_city", f"%{dest_city}%")
    result = query.order(order_by, desc=True).execute()
    return result.data

@router.get("/{listing_id}")
async def get_listing(listing_id: str):
    result = supabase.table("listings").select("*").eq("id", listing_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Listing not found")
    return result.data

@router.post("")
async def create_listing(body: ListingCreate, user=Depends(get_current_user)):
    data = body.model_dump()
    data["owner_id"] = user.id
    data["status"] = "open"
    data["depart_date"] = str(data["depart_date"])
    data["arrive_date"] = str(data["arrive_date"])
    result = supabase.table("listings").insert(data).execute()
    return result.data[0]

@router.patch("/{listing_id}")
async def update_listing(listing_id: str, body: dict, user=Depends(get_current_user)):
    existing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
    if not existing.data or existing.data["owner_id"] != user.id:
        raise HTTPException(403, "Not your listing")
    result = supabase.table("listings").update(body).eq("id", listing_id).execute()
    return result.data[0]

@router.delete("/{listing_id}")
async def cancel_listing(listing_id: str, user=Depends(get_current_user)):
    existing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
    if not existing.data or existing.data["owner_id"] != user.id:
        raise HTTPException(403, "Not your listing")
    result = supabase.table("listings").update({"status": "cancelled"}).eq("id", listing_id).execute()
    return result.data[0]