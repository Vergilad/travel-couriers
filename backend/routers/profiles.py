from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ProfileUpdate
from routers.auth import get_current_user
from error_handlers import handle_db_errors
from db_constants import Tables, ProfileFields, ListingFields, ListingStatus
from query_helpers import get_record_by_id

router = APIRouter()

PUBLIC_PROFILE_FIELDS = f"{ProfileFields.ID}, {ProfileFields.DISPLAY_NAME}, {ProfileFields.AVATAR_URL}, {ProfileFields.BIO}, {ProfileFields.CITY}, {ProfileFields.COUNTRY}, {ProfileFields.CREATED_AT}"
MY_PROFILE_FIELDS = PUBLIC_PROFILE_FIELDS

@router.get("/me")
@handle_db_errors("fetch profile")
async def get_my_profile(user=Depends(get_current_user)):
    return await get_record_by_id(Tables.PROFILES, user.id, MY_PROFILE_FIELDS)

@router.patch("/me")
@handle_db_errors("update profile")
async def update_my_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = supabase.table(Tables.PROFILES).update(updates).eq(ProfileFields.ID, user.id).execute()
    return result.data[0]

@router.get("/{user_id}")
@handle_db_errors("fetch profile")
async def get_public_profile(user_id: str):
    return await get_record_by_id(Tables.PROFILES, user_id, PUBLIC_PROFILE_FIELDS)

@router.get("/{user_id}/listings")
@handle_db_errors("fetch listings")
async def get_profile_listings(user_id: str):
    result = supabase.table(Tables.LISTINGS).select(
        f"{ListingFields.ID}, {ListingFields.KIND}, {ListingFields.ORIGIN_CITY}, {ListingFields.DEST_CITY}, {ListingFields.STATUS}, {ListingFields.CREATED_AT}"
    ).eq(ListingFields.OWNER_ID, user_id).eq(ListingFields.STATUS, ListingStatus.OPEN).order(ListingFields.CREATED_AT, desc=True).execute()
    return result.data


@router.get("/{user_id}/history")
@handle_db_errors("fetch history")
async def get_profile_history(user_id: str):
    """Completed deals the user took part in — compressed to where/when/who.
    The other party's name + avatar are denormalized snapshots so history
    survives listing/thread deletion."""
    result = (
        supabase.table(Tables.COMPLETED_DEALS)
        .select("id, kind, origin_city, dest_city, depart_date, completed_at, user_a, user_b, user_a_name, user_a_avatar, user_b_name, user_b_avatar")
        .or_(f"user_a.eq.{user_id},user_b.eq.{user_id}")
        .order("completed_at", desc=True)
        .execute()
    )
    rows = result.data or []
    history = []
    for r in rows:
        is_a = r.get("user_a") == user_id
        partner_name = r.get("user_a_name") if not is_a else r.get("user_b_name")
        partner_avatar = r.get("user_a_avatar") if not is_a else r.get("user_b_avatar")
        history.append({
            "id": r.get("id"),
            "kind": r.get("kind"),
            "origin_city": r.get("origin_city"),
            "dest_city": r.get("dest_city"),
            "depart_date": r.get("depart_date"),
            "completed_at": r.get("completed_at"),
            "partner": {"display_name": partner_name, "avatar_url": partner_avatar},
        })
    return history
