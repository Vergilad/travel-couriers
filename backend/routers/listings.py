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
    order_by: str = "created_at",
    limit: int = None,
):
    try:
        query = supabase.table("listings").select("*").eq("status", status)
        if kind:
            query = query.eq("kind", kind)
        if origin_city:
            query = query.ilike("origin_city", f"%{origin_city}%")
        if dest_city:
            query = query.ilike("dest_city", f"%{dest_city}%")
        query = query.order(order_by, desc=True)
        if limit:
            query = query.limit(limit)
        result = query.execute()
        return result.data
    except Exception as e:
        raise HTTPException(400, f"Failed to browse listings: {str(e)}")

@router.get("/{listing_id}")
async def get_listing(listing_id: str):
    try:
        result = supabase.table("listings").select("*").eq("id", listing_id).single().execute()
        if not result.data:
            raise HTTPException(404, "Listing not found")
        return result.data
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(404, "Listing not found")

@router.post("")
async def create_listing(body: ListingCreate, user=Depends(get_current_user)):
    try:
        data = body.model_dump()
        data["owner_id"] = user.id
        data["status"] = "open"
        data["depart_date"] = data["depart_date"].isoformat()
        data["arrive_date"] = data["arrive_date"].isoformat()
        result = supabase.table("listings").insert(data).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(400, f"Failed to create listing: {str(e)}")

@router.patch("/{listing_id}")
async def update_listing(listing_id: str, body: dict, user=Depends(get_current_user)):
    try:
        existing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
        if not existing.data or existing.data["owner_id"] != user.id:
            raise HTTPException(403, "Not your listing")
        result = supabase.table("listings").update(body).eq("id", listing_id).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to update listing: {str(e)}")

@router.delete("/{listing_id}")
async def cancel_listing(listing_id: str, user=Depends(get_current_user)):
    try:
        existing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
        if not existing.data or existing.data["owner_id"] != user.id:
            raise HTTPException(403, "Not your listing")
        result = supabase.table("listings").update({"status": "cancelled"}).eq("id", listing_id).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to cancel listing: {str(e)}")