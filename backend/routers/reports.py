from fastapi import APIRouter, Depends
from db import supabase
from models import ReportCreate
from routers.auth import get_current_user

router = APIRouter()

@router.post("")
async def create_report(body: ReportCreate, user=Depends(get_current_user)):
    result = supabase.table("reports").insert({
        "reporter_id": user.id,
        "target_user_id": body.target_user_id,
        "target_listing_id": body.target_listing_id,
        "reason": body.reason,
        "details": body.details,
        "status": "open"
    }).execute()
    return result.data[0]