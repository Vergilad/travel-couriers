from fastapi import APIRouter, Depends, HTTPException
from db import get_conn, fetchone, fetchall
from models import ReviewCreate
from routers.auth import get_current_user
from error_handlers import handle_db_errors, public_error

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
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, display_name, avatar_url FROM profiles WHERE id = ANY(%s)",
            (list(reviewer_ids),),
        )
        prof_map = {p["id"]: p for p in fetchall(cur)}
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
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, kind, origin_city, dest_city, completed_at, user_a, user_b"
            " FROM completed_deals WHERE user_a = %s OR user_b = %s"
            " ORDER BY completed_at DESC",
            (user.id, user.id),
        )
        deals = fetchall(cur)
        cur.execute(
            "SELECT completed_deal_id FROM reviews WHERE reviewer_id = %s",
            (user.id,),
        )
        already_reviewed = {r["completed_deal_id"] for r in fetchall(cur)}

    for d in deals:
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
    # Eligibility (server-side source of truth): the completed_deal must
    # exist and have both the reviewer and the named reviewee as its parties.
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, user_a, user_b FROM completed_deals WHERE id = %s",
            (body.completed_deal_id,),
        )
        deal = fetchone(cur)
    deal = deal or {}
    user_a, user_b = deal.get("user_a"), deal.get("user_b")
    parties = {user_a, user_b}
    if not deal or user.id not in parties:
        raise HTTPException(403, "You are not a party to this completed deal")
    if body.reviewee_id not in parties or body.reviewee_id == user.id:
        raise HTTPException(400, "Invalid reviewee for this deal")

    # Insert. The UNIQUE(completed_deal_id, reviewer_id) constraint catches a
    # double-submit race; surface it as a clear 409.
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reviews (completed_deal_id, reviewer_id, reviewee_id,"
                " rating, comment) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                (
                    body.completed_deal_id, user.id, body.reviewee_id,
                    body.rating, body.comment or None,
                ),
            )
            result = fetchall(cur)
    except Exception as e:
        msg = str(e)
        if "reviews_completed_deal_id_reviewer_id_key" in msg or "already exists" in msg.lower():
            raise HTTPException(409, "You have already reviewed this deal")
        raise public_error("create review", e)

    return _enrich_reviews(result)[0]


@router.get("/{user_id}")
@handle_db_errors("fetch reviews")
async def get_reviews(user_id: str):
    """All reviews received by user_id, newest first, with reviewer profiles merged."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"SELECT {REVIEW_FIELDS} FROM reviews WHERE reviewee_id = %s"
            " ORDER BY created_at DESC",
            (user_id,),
        )
        return _enrich_reviews(fetchall(cur))
