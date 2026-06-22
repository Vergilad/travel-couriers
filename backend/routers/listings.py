from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ListingCreate
from routers.auth import get_current_user
from error_handlers import handle_db_errors
from db_constants import Tables, ListingFields, ListingStatus

router = APIRouter()

@router.get("")
@handle_db_errors("browse listings")
async def browse_listings(
    kind: str = None,
    origin_city: str = None,
    dest_city: str = None,
    status: str = ListingStatus.OPEN,
    order_by: str = ListingFields.CREATED_AT,
    limit: int = 20,
    offset: int = 0
):
    query = supabase.table(Tables.LISTINGS).select("*").eq(ListingFields.STATUS, status)
    if kind:
        query = query.eq(ListingFields.KIND, kind)
    if origin_city:
        query = query.ilike(ListingFields.ORIGIN_CITY, f"%{origin_city}%")
    if dest_city:
        query = query.ilike(ListingFields.DEST_CITY, f"%{dest_city}%")
    result = query.order(order_by, desc=True).limit(limit).offset(offset).execute()
    return result.data

@router.get("/{listing_id}")
@handle_db_errors("fetch listing")
async def get_listing(listing_id: str):
    result = supabase.table(Tables.LISTINGS).select(
        f"{ListingFields.ID}, {ListingFields.KIND}, {ListingFields.ORIGIN_CITY}, {ListingFields.DEST_CITY}, {ListingFields.DEPART_DATE}, {ListingFields.ARRIVE_DATE}, {ListingFields.OWNER_ID}, {ListingFields.STATUS}, {ListingFields.CREATED_AT}, {ListingFields.DESCRIPTION}"
    ).eq(ListingFields.ID, listing_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Listing not found")
    return result.data

@router.post("")
@handle_db_errors("create listing")
async def create_listing(body: ListingCreate, user=Depends(get_current_user)):
    data = body.model_dump()
    data[ListingFields.OWNER_ID] = user.id
    data[ListingFields.STATUS] = ListingStatus.OPEN
    data[ListingFields.DEPART_DATE] = data[ListingFields.DEPART_DATE].isoformat()
    data[ListingFields.ARRIVE_DATE] = data[ListingFields.ARRIVE_DATE].isoformat()
    result = supabase.table(Tables.LISTINGS).insert(data).execute()
    return result.data[0]

@router.patch("/{listing_id}")
@handle_db_errors("update listing")
async def update_listing(listing_id: str, body: dict, user=Depends(get_current_user)):
    existing = supabase.table(Tables.LISTINGS).select(ListingFields.OWNER_ID).eq(ListingFields.ID, listing_id).single().execute()
    if not existing.data or existing.data[ListingFields.OWNER_ID] != user.id:
        raise HTTPException(403, "Not your listing")
    result = supabase.table(Tables.LISTINGS).update(body).eq(ListingFields.ID, listing_id).execute()
    return result.data[0]

@router.delete("/{listing_id}")
@handle_db_errors("cancel listing")
async def cancel_listing(listing_id: str, user=Depends(get_current_user)):
    existing = supabase.table(Tables.LISTINGS).select(ListingFields.OWNER_ID).eq(ListingFields.ID, listing_id).single().execute()
    if not existing.data or existing.data[ListingFields.OWNER_ID] != user.id:
        raise HTTPException(403, "Not your listing")
    result = supabase.table(Tables.LISTINGS).update({ListingFields.STATUS: ListingStatus.CANCELLED}).eq(ListingFields.ID, listing_id).execute()
    return result.data[0]
