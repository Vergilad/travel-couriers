from fastapi import APIRouter, Depends, HTTPException
from db import get_conn, fetchone, fetchall
from models import ProfileUpdate
from routers.auth import get_current_user
from error_handlers import handle_db_errors
from db_constants import Tables, ProfileFields, ListingFields, ListingStatus
from query_helpers import get_record_by_id

router = APIRouter()

PUBLIC_PROFILE_FIELDS = f"{ProfileFields.ID}, {ProfileFields.DISPLAY_NAME}, {ProfileFields.AVATAR_URL}, {ProfileFields.BIO}, {ProfileFields.CITY}, {ProfileFields.COUNTRY}, {ProfileFields.CREATED_AT}, {ProfileFields.IDENTITY_VERIFIED}"
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
    assignments = ", ".join(f"{col} = %s" for col in updates)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE {Tables.PROFILES} SET {assignments}"
            f" WHERE {ProfileFields.ID} = %s RETURNING *",
            (*updates.values(), user.id),
        )
        return fetchone(cur)

@router.get("/{user_id}")
@handle_db_errors("fetch profile")
async def get_public_profile(user_id: str):
    return await get_record_by_id(Tables.PROFILES, user_id, PUBLIC_PROFILE_FIELDS)

@router.get("/{user_id}/listings")
@handle_db_errors("fetch listings")
async def get_profile_listings(user_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT {ListingFields.ID}, {ListingFields.KIND},"
            f" {ListingFields.ORIGIN_CITY}, {ListingFields.DEST_CITY},"
            f" {ListingFields.STATUS}, {ListingFields.CREATED_AT}"
            f" FROM {Tables.LISTINGS} WHERE {ListingFields.OWNER_ID} = %s"
            f" AND {ListingFields.STATUS} = %s"
            f" ORDER BY {ListingFields.CREATED_AT} DESC",
            (user_id, ListingStatus.OPEN),
        )
        return fetchall(cur)
