from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ListingCreate
from routers.auth import get_current_user
from typing import Optional

router = APIRouter()


def _require_db():
    if not supabase:
        raise HTTPException(503, "Database not configured")

# Саша я решил сделать отдельную функцию для прикрепления профилей гадов к объявлениям, чтобы там не повторяться бльшею
def attach_owner_profiles(listings: list[dict]) -> list[dict]:
    if not listings:
        return listings

    owner_ids = list({
        listing["owner_id"]
        for listing in listings
        if listing.get("owner_id")
    })

    if not owner_ids:
        return listings

    profiles_result = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url, bio, city, country")
        .in_("id", owner_ids)
        .execute()
    )

    profiles = profiles_result.data or []

    profile_map = {
        profile["id"]: profile
        for profile in profiles
    }

    for listing in listings:
        profile = profile_map.get(listing["owner_id"])

        listing["owner"] = profile

        if profile:
            listing["owner_display_name"] = profile.get("display_name")
            listing["owner_avatar_url"] = profile.get("avatar_url")

    return listings

@router.get("/mine")
async def my_listings(user=Depends(get_current_user)):
    _require_db()
    result = (
        supabase.table("listings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("")
async def browse_listings(
    kind: Optional[str] = None,
    origin_city: Optional[str] = None,
    dest_city: Optional[str] = None,
    status: str = "open",
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    depart_from: Optional[str] = None,
    depart_to: Optional[str] = None,
    order_by: str = "created_at",
    limit: int = 40,
    offset: int = 0,
):
    _require_db()
    query = (
        supabase.table("listings")
        .select("*")
        .eq("status", status)
    )
    if kind:
        query = query.eq("kind", kind)
    if origin_city:
        query = query.ilike("origin_city", f"%{origin_city}%")
    if dest_city:
        query = query.ilike("dest_city", f"%{dest_city}%")
    if price_min is not None:
        query = query.gte("price", price_min)
    if price_max is not None:
        query = query.lte("price", price_max)
    if depart_from:
        query = query.gte("depart_date", depart_from)
    if depart_to:
        query = query.lte("depart_date", depart_to)

    result = query.order(order_by, desc=True).limit(limit).offset(offset).execute()

    return attach_owner_profiles(result.data or [])


@router.get("/{listing_id}")
async def get_listing(listing_id: str):
    _require_db()
    result = (
        supabase.table("listings")
        .select("*")
        .eq("id", listing_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Listing not found")

    listing = attach_owner_profiles([result.data])[0]
    return listing


@router.post("")
async def create_listing(body: ListingCreate, user=Depends(get_current_user)):
    _require_db()
    data = body.model_dump(exclude_none=True)
    data["owner_id"] = user.id
    data["status"] = "open"
    if "depart_date" in data and data["depart_date"]:
        data["depart_date"] = data["depart_date"].isoformat()
    if "arrive_date" in data and data["arrive_date"]:
        data["arrive_date"] = data["arrive_date"].isoformat()

    data.pop("accepts_multiple", None)

    try:
        result = supabase.table("listings").insert(data).execute()
    except Exception as e:
        err = str(e)
        if "date_flexibility" in err:
            data.pop("date_flexibility", None)
            result = supabase.table("listings").insert(data).execute()
        else:
            raise

    return result.data[0]


@router.patch("/{listing_id}")
async def update_listing(listing_id: str, body: dict, user=Depends(get_current_user)):
    _require_db()
    existing = (
        supabase.table("listings")
        .select("owner_id")
        .eq("id", listing_id)
        .single()
        .execute()
    )
    if not existing.data or existing.data["owner_id"] != user.id:
        raise HTTPException(403, "Not your listing")
    result = supabase.table("listings").update(body).eq("id", listing_id).execute()
    return result.data[0]


@router.delete("/{listing_id}")
async def delete_listing(listing_id: str, user=Depends(get_current_user)):
    _require_db()
    existing = (
        supabase.table("listings")
        .select("owner_id")
        .eq("id", listing_id)
        .single()
        .execute()
    )
    if not existing.data or existing.data["owner_id"] != user.id:
        raise HTTPException(403, "Not your listing")
    supabase.table("listings").delete().eq("id", listing_id).execute()
    return {"deleted": True}
