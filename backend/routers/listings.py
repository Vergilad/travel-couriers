from fastapi import APIRouter, Depends, HTTPException
from db import get_conn, fetchone, fetchall
from models import ListingCreate, flexibility_window_days, date_falls_in_window, dates_overlap
from routers.auth import get_current_user
from typing import Optional
from datetime import date

router = APIRouter()


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

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, display_name, avatar_url, bio, city, country,"
            " identity_verified FROM profiles WHERE id = ANY(%s)",
            (owner_ids,),
        )
        profiles = fetchall(cur)

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
    with get_conn() as conn, conn.cursor() as cur:
        # 1. Fetch the current user's open listings
        cur.execute(
            "SELECT * FROM listings WHERE owner_id = %s AND status = 'open'",
            (user.id,),
        )
        my_listings = fetchall(cur)

        if not my_listings:
            return []

        groups = []
        for my_listing in my_listings:
            my_kind = my_listing.get("kind")

            # Two sides: carry matches need, need matches carry.
            match_kind = "need" if my_kind == "carry" else "carry"

            origin = my_listing.get("origin_city", "")
            dest = my_listing.get("dest_city", "")

            my_date_str = my_listing.get("depart_date")
            my_date = date.fromisoformat(my_date_str) if my_date_str else None
            my_flex = flexibility_window_days(my_listing.get("date_flexibility"))

            # 2. Fetch candidates with matching route from other users
            cur.execute(
                "SELECT * FROM listings WHERE status = 'open' AND kind = %s"
                " AND owner_id <> %s AND origin_city ILIKE %s"
                " AND dest_city ILIKE %s",
                (match_kind, user.id, f"%{origin}%", f"%{dest}%"),
            )
            candidates = fetchall(cur)

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
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM listings WHERE owner_id = %s ORDER BY created_at DESC",
            (user.id,),
        )
        return fetchall(cur)


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
    # Date filtering is applied in Python (not SQL) so that:
    #   • a listing's flexibility window widens its matchable range, and
    #   • undated listings (NULL depart_date) still surface under any time
    #     filter instead of being dropped by a `depart_date >= X` clause.
    where = ["status = %s"]
    params: list = [status]
    if kind:
        where.append("kind = %s")
        params.append(kind)
    if origin_city:
        where.append("origin_city ILIKE %s")
        params.append(f"%{origin_city}%")
    if dest_city:
        where.append("dest_city ILIKE %s")
        params.append(f"%{dest_city}%")
    if price_min is not None:
        where.append("price >= %s")
        params.append(price_min)
    if price_max is not None:
        where.append("price <= %s")
        params.append(price_max)

    # Fetch a generous pool so Python-side date filtering + sort don't get
    # truncated by the page limit before undated listings can surface.
    pool_limit = min(max(limit * 5, limit + 50), 200)
    if order_by not in {"created_at", "depart_date", "price"}:
        order_by = "created_at"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT * FROM listings WHERE {' AND '.join(where)}"
            f" ORDER BY {order_by} DESC LIMIT %s",
            (*params, pool_limit),
        )
        rows = fetchall(cur)

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
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM listings WHERE id = %s", (listing_id,))
        row = fetchone(cur)
    if not row:
        raise HTTPException(404, "Listing not found")

    listing = attach_owner_profiles([row])[0]
    return listing


@router.post("")
async def create_listing(body: ListingCreate, user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    data["owner_id"] = user.id
    data["status"] = "open"
    if data.get("kind") == "carry":
        # The purchase flag is a need-side detail; never set on carry.
        data["needs_purchase"] = False

    data.pop("accepts_multiple", None)

    cols = ", ".join(data.keys())
    placeholders = ", ".join(["%s"] * len(data))
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO listings ({cols}) VALUES ({placeholders}) RETURNING *",
            tuple(data.values()),
        )
        return fetchone(cur)


PATCHABLE = {
    "kind", "origin_city", "origin_country", "dest_city", "dest_country",
    "title", "description", "price", "currency",
    "depart_date", "arrive_date", "date_flexibility", "status",
    "needs_purchase",
}


@router.patch("/{listing_id}")
async def update_listing(listing_id: str, body: dict, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.items() if k in PATCHABLE}
    if not updates:
        raise HTTPException(400, "No fields to update")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT owner_id FROM listings WHERE id = %s", (listing_id,))
        existing = fetchone(cur)
        if not existing or existing["owner_id"] != user.id:
            raise HTTPException(403, "Not your listing")
        assignments = ", ".join(f"{col} = %s" for col in updates)
        cur.execute(
            f"UPDATE listings SET {assignments} WHERE id = %s RETURNING *",
            (*updates.values(), listing_id),
        )
        return fetchone(cur)


@router.delete("/{listing_id}")
async def delete_listing(listing_id: str, user=Depends(get_current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT owner_id FROM listings WHERE id = %s", (listing_id,))
        existing = fetchone(cur)
        if not existing or existing["owner_id"] != user.id:
            raise HTTPException(403, "Not your listing")
        cur.execute("DELETE FROM listings WHERE id = %s", (listing_id,))
    return {"deleted": True}
