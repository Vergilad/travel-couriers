from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ReviewCreate
from routers.auth import get_current_user

router = APIRouter()

@router.post("")
async def create_review(body: ReviewCreate, user=Depends(get_current_user)):
    try:
        # Guard: payment must be completed for this listing
        payment = supabase.table("payments").select("status").eq("listing_id", body.listing_id).eq("status", "completed").execute()
        if not payment.data:
            raise HTTPException(403, "Can only review after payment is completed")
        result = supabase.table("reviews").insert({
            "listing_id": body.listing_id,
            "reviewer_id": user.id,
            "reviewee_id": body.reviewee_id,
            "rating": body.rating,
            "comment": body.comment
        }).execute()
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to create review: {str(e)}")

@router.get("/{user_id}")
async def get_reviews(user_id: str):
    try:
        result = supabase.table("reviews").select("*").eq("reviewee_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch reviews: {str(e)}")