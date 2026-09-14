from fastapi import APIRouter, Depends, HTTPException
from db import get_conn, fetchone
from error_handlers import public_error
from models import ReportCreate
from routers.auth import get_current_user

router = APIRouter()

@router.post("")
async def create_report(body: ReportCreate, user=Depends(get_current_user)):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reports (reporter_id, target_user_id,"
                " target_listing_id, reason, details, status)"
                " VALUES (%s, %s, %s, %s, %s, 'open') RETURNING *",
                (
                    user.id, body.target_user_id, body.target_listing_id,
                    body.reason, body.details,
                ),
            )
            return fetchone(cur)
    except Exception as e:
        raise public_error("create report", e)
