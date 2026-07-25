from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ListingCreate, flexibility_window_days, date_falls_in_window, dates_overlap
from routers.auth import get_current_user
from typing import Optional
from datetime import date

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
        .select("id, display_name, avatar_url, bio, city, country, identity_verified")
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

@router.get("/matches")
async def get_matches(user=Depends(get_current_user)):
    _require_db()

    # 1. Fetch the current user's open listings
    mine_result = (
        supabase.table("listings")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "open")
        .execute()
    )
    my_listings = mine_result.data or []

    if not my_listings:
        return []

    groups = []
    for my_listing in my_listings:
        my_kind = my_listing.get("kind")

        # Trips match against requests and deliveries; requests/deliveries match against trips
        if my_kind == "trip":
            match_kinds = ["request", "delivery"]
        else:
            match_kinds = ["trip"]

        origin = my_listing.get("origin_city", "")
        dest = my_listing.get("dest_city", "")

        my_date_str = my_listing.get("depart_date")
        my_date = date.fromisoformat(my_date_str) if my_date_str else None
        my_flex = flexibility_window_days(my_listing.get("date_flexibility"))

        # 2. Fetch candidates with matching route from other users
        candidates = []
        for kind in match_kinds:
            result = (
                supabase.table("listings")
                .select("*")
                .eq("status", "open")
                .eq("kind", kind)
                .neq("owner_id", user.id)
                .ilike("origin_city", f"%{origin}%")
                .ilike("dest_city", f"%{dest}%")
                .execute()
            )
            candidates.extend(result.data or [])

        # 3. Filter by overlapping date windows
        matched = []
        for candidate in candidates:
            cand_date_str = candidate.get("depart_date")
            cand_date = date.fromisoformat(cand_date_str) if cand_date_str else None
            cand_flex = flexibility_window_days(candidate.get("date_flexibility"))
            if dates_overlap(my_date, my_flex, cand_date, cand_flex):
                matched.append(candidate)

        if matched:
            matched = attach_owner_profiles(matched)
            groups.append({"listing": my_listing, "matches": matched})

    return groups


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
    # Date filtering is applied in Python (not SQL) so that:
    #   • a listing's flexibility window widens its matchable range, and
    #   • undated listings (NULL depart_date) still surface under any time
    #     filter instead of being dropped by a `depart_date >= X` clause.
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

    # Fetch a generous pool so Python-side date filtering + sort don't get
    # truncated by the page limit before undated listings can surface.
    pool_limit = min(max(limit * 5, limit + 50), 200)
    result = query.order(order_by, desc=True).limit(pool_limit).execute()
    rows = result.data or []

    has_date_filter = bool(depart_from or depart_to)
    parsed_from = date.fromisoformat(depart_from) if depart_from else None
    parsed_to = date.fromisoformat(depart_to) if depart_to else None

    if has_date_filter:
        def in_window(row: dict) -> bool:
            raw = row.get("depart_date")
            listing_date = date.fromisoformat(raw) if isinstance(raw, str) else raw
            flex = flexibility_window_days(row.get("date_flexibility"))
            return date_falls_in_window(listing_date, parsed_from, parsed_to, flex)

        rows = [r for r in rows if in_window(r)]

    # Sort: dated listings first (newest created_at first), then undated ones
    # (newest first). ISO timestamps sort lexically, so to get newest-first we
    # sort ascending on the group flag then reverse-compare created_at via a
    # two-pass stable sort (Python's sort is stable, so each pass refines).
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)  # newest first
    rows.sort(key=lambda r: 0 if r.get("depart_date") else 1)         # dated first, stable

    page = rows[offset:offset + limit] if offset else rows[:limit]
    return attach_owner_profiles(page)


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
