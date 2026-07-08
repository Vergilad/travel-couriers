from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from models import ReviewCreate
from routers.auth import get_current_user
from error_handlers import handle_db_errors

router = APIRouter()

# Only the fields the profile/review UIs need. listing_id is intentionally
# excluded — it's informational only and may be NULL after a deal closes.
REVIEW_FIELDS = "id, completed_deal_id, reviewer_id, reviewee_id, rating, comment, created_at"


def _enrich_reviews(rows: list[dict]) -> list[dict]:
    """Merge each review with its reviewer's public profile.

    Per the Peregri "backend is the source of truth" rule: the frontend should
    receive frontend-ready objects, not have to fan out and join profiles itself.
    Mirrors the listings → profiles enrichment pattern.
    """
    reviewer_ids = {r["reviewer_id"] for r in rows if r.get("reviewer_id")}
    if not reviewer_ids:
        return rows
    prof_res = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url")
        .in_("id", list(reviewer_ids))
        .execute()
    )
    prof_map = {p["id"]: p for p in (prof_res.data or [])}
    for r in rows:
        p = prof_map.get(r.get("reviewer_id"), {})
        r["reviewer"] = {
            "id": r.get("reviewer_id"),
            "display_name": p.get("display_name"),
            "avatar_url": p.get("avatar_url"),
        }
    return rows


# IMPORTANT: this must be declared BEFORE the `/{user_id}` route, otherwise
# FastAPI matches "/{user_id}" against the literal "eligible".
@router.get("/eligible/with")
@handle_db_errors("fetch eligible deal")
async def get_eligible_deal(partner_id: str, user=Depends(get_current_user)):
    """The most recent completed deal between the caller and partner_id that the
    caller has NOT yet reviewed. Drives the "Rate {partner}" button on the
    partner's profile. Returns null when there is nothing to review.
    """
    deals = (
        supabase.table("completed_deals")
        .select("id, kind, origin_city, dest_city, completed_at, user_a, user_b")
        .or_(f"user_a.eq.{user.id},user_b.eq.{user.id}")
        .order("completed_at", desc=True)
        .execute()
    )
    my_reviews = (
        supabase.table("reviews")
        .select("completed_deal_id")
        .eq("reviewer_id", user.id)
        .execute()
    )
    already_reviewed = {r["completed_deal_id"] for r in (my_reviews.data or [])}

    for d in deals.data or []:
        parties = {d.get("user_a"), d.get("user_b")}
        if partner_id in parties and user.id in parties and d["id"] not in already_reviewed:
            return {
                "completed_deal_id": d["id"],
                "reviewee_id": partner_id,
                "kind": d.get("kind"),
                "origin_city": d.get("origin_city"),
                "dest_city": d.get("dest_city"),
                "completed_at": d.get("completed_at"),
            }
    return None


@router.post("")
@handle_db_errors("create review")
async def create_review(body: ReviewCreate, user=Depends(get_current_user)):
    if not supabase:
        raise HTTPException(503, "Database not configured")

    # Eligibility (server-side source of truth — service role bypasses RLS):
    # the completed_deal must exist and have both the reviewer and the named
    # reviewee as its two parties.
    deal_res = (
        supabase.table("completed_deals")
        .select("id, user_a, user_b")
        .eq("id", body.completed_deal_id)
        .maybe_single()
        .execute()
    )
    deal = deal_res.data or {}
    user_a, user_b = deal.get("user_a"), deal.get("user_b")
    parties = {user_a, user_b}
    if not deal or user.id not in parties:
        raise HTTPException(403, "You are not a party to this completed deal")
    if body.reviewee_id not in parties or body.reviewee_id == user.id:
        raise HTTPException(400, "Invalid reviewee for this deal")

    # Insert. The UNIQUE(completed_deal_id, reviewer_id) constraint catches a
    # double-submit race; surface it as a clear 409.
    try:
        result = supabase.table("reviews").insert({
            "completed_deal_id": body.completed_deal_id,
            "reviewer_id": user.id,
            "reviewee_id": body.reviewee_id,
            "rating": body.rating,
            "comment": body.comment or None,
        }).execute()
    except Exception as e:
        msg = str(e)
        if "completed_deal_reviewer_unique" in msg or "unique" in msg.lower():
            raise HTTPException(409, "You have already reviewed this deal")
        raise HTTPException(400, f"Failed to create review: {msg}")

    return _enrich_reviews(result.data)[0]


@router.get("/{user_id}")
@handle_db_errors("fetch reviews")
async def get_reviews(user_id: str):
    """All reviews received by user_id, newest first, with reviewer profiles merged."""
    result = (
        supabase.table("reviews")
        .select(REVIEW_FIELDS)
        .eq("reviewee_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return _enrich_reviews(result.data or [])
