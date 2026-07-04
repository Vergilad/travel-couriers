from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user

router = APIRouter()


def _guard():
    if not supabase:
        raise HTTPException(503, "Database not configured")


def _assert_participant(thread_id: str, user_id: str):
    check = (
        supabase.table("thread_participants")
        .select("user_id")
        .eq("thread_id", thread_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not check.data:
        raise HTTPException(403, "Not a participant in this thread")


def _get_thread_context(thread_id: str):
    """Return (thread, listing, participant_ids) for a thread."""
    thread_res = (
        supabase.table("threads")
        .select("id, listing_id")
        .eq("id", thread_id)
        .single()
        .execute()
    )
    if not thread_res.data:
        raise HTTPException(404, "Thread not found")
    thread = thread_res.data

    listing = None
    if thread.get("listing_id"):
        l = (
            supabase.table("listings")
            .select("id, kind, status, owner_id, origin_city, origin_country, dest_city, dest_country, depart_date, arrive_date, price, currency")
            .eq("id", thread["listing_id"])
            .single()
            .execute()
        )
        listing = l.data

    parts = (
        supabase.table("thread_participants")
        .select("user_id")
        .eq("thread_id", thread_id)
        .execute()
    )
    participant_ids = [p["user_id"] for p in (parts.data or [])]
    return thread, listing, participant_ids


def _both_confirmed(thread_id: str) -> bool:
    confs = (
        supabase.table("match_confirmations")
        .select("user_id")
        .eq("thread_id", thread_id)
        .execute()
    )
    return bool(confs.data) and len(confs.data) >= 2


def _derive_stage(listing, both_confirmed: bool) -> str:
    """Map listing status + confirmation state to a UI stage."""
    if not listing:
        return "none"
    status = listing.get("status")
    if status == "completed":
        return "done"
    if status == "cancelled":
        return "none"
    if both_confirmed:
        return "matched"
    return "none"


def _post_system_message(thread_id: str, body: str):
    """Insert a system-authored message (sender_id NULL, is_system true)."""
    try:
        supabase.table("messages").insert({
            "thread_id": thread_id,
            "sender_id": None,
            "body": body,
            "is_system": True,
        }).execute()
    except Exception:
        # Non-fatal: the match still succeeds; the system message is best-effort.
        pass


@router.post("/confirm")
async def confirm_match(thread_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        _assert_participant(thread_id, user.id)

        # Insert confirmation (composite PK prevents duplicates per user).
        already = (
            supabase.table("match_confirmations")
            .select("user_id")
            .eq("thread_id", thread_id)
            .eq("user_id", user.id)
            .execute()
        )
        if not already.data:
            supabase.table("match_confirmations").insert({
                "thread_id": thread_id,
                "user_id": user.id,
            }).execute()

        thread, listing, participant_ids = _get_thread_context(thread_id)
        both = _both_confirmed(thread_id)
        kind = listing.get("kind") if listing else None

        # When both confirm, post a system message (once — guarded by both
        # transitioning only on the second confirmer).
        if both and len(participant_ids) == 2:
            # Fetch names for a friendly system message.
            prof_res = (
                supabase.table("profiles")
                .select("id, display_name")
                .in_("id", participant_ids)
                .execute()
            )
            names = [p.get("display_name") or "Traveler" for p in (prof_res.data or [])]
            label_a = names[0] if len(names) > 0 else "Traveler"
            label_b = names[1] if len(names) > 1 else "Traveler"
            _post_system_message(
                thread_id,
                f"✦ {label_a} and {label_b} confirmed the match — you're connected. "
                f"Agree on the details, then close the deal when it's done.",
            )

        return {
            "status": "matched" if both else "waiting",
            "both_confirmed": both,
            "confirmed_by_me": True,
            "listing_kind": kind,
            "message": "Both parties confirmed — match complete" if both
                       else "Waiting for the other party to confirm",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to confirm match: {str(e)}")


@router.get("")
async def get_match_state(thread_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        thread, listing, participant_ids = _get_thread_context(thread_id)

        confs = (
            supabase.table("match_confirmations")
            .select("user_id")
            .eq("thread_id", thread_id)
            .execute()
        )
        confirmed_ids = {c["user_id"] for c in (confs.data or [])}
        both = len(confirmed_ids) >= 2 and len(participant_ids) == 2

        return {
            "stage": _derive_stage(listing, both),
            "me_confirmed": user.id in confirmed_ids,
            "other_confirmed": any(uid in confirmed_ids for uid in participant_ids if uid != user.id),
            "both_confirmed": both,
            "listing_kind": listing.get("kind") if listing else None,
            "listing_status": listing.get("status") if listing else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch match state: {str(e)}")


@router.post("/close-deal")
async def close_deal(thread_id: str, user=Depends(get_current_user)):
    """Stage 2: finalize a matched deal. Archives a snapshot to completed_deals,
    then removes the listing + thread + messages (non-trip) or just the thread
    (trip — courier keeps the open listing for other senders)."""
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        thread, listing, participant_ids = _get_thread_context(thread_id)

        if len(participant_ids) != 2:
            raise HTTPException(400, "Close-deal requires exactly two participants")
        if not _both_confirmed(thread_id):
            raise HTTPException(400, "Both parties must confirm the match before closing the deal")
        if not listing:
            raise HTTPException(400, "Thread has no associated listing")
        if listing.get("status") == "completed":
            raise HTTPException(400, "This deal has already been closed")

        # Snapshot both participants' public profile (name/avatar).
        prof_res = (
            supabase.table("profiles")
            .select("id, display_name, avatar_url")
            .in_("id", participant_ids)
            .execute()
        )
        prof_map = {p["id"]: p for p in (prof_res.data or [])}
        user_a_id = participant_ids[0]
        user_b_id = participant_ids[1]
        a = prof_map.get(user_a_id, {})
        b = prof_map.get(user_b_id, {})

        # Archive a compressed snapshot to history.
        supabase.table("completed_deals").insert({
            "listing_id": listing.get("id"),
            "kind": listing.get("kind"),
            "origin_city": listing.get("origin_city"),
            "origin_country": listing.get("origin_country"),
            "dest_city": listing.get("dest_city"),
            "dest_country": listing.get("dest_country"),
            "depart_date": listing.get("depart_date"),
            "arrive_date": listing.get("arrive_date"),
            "user_a": user_a_id,
            "user_b": user_b_id,
            "user_a_name": a.get("display_name"),
            "user_a_avatar": a.get("avatar_url"),
            "user_b_name": b.get("display_name"),
            "user_b_avatar": b.get("avatar_url"),
        }).execute()

        # System message first (thread is about to be removed, so this is
        # informational for the archive only on the trip path; for non-trip the
        # thread is deleted anyway).
        kind = listing.get("kind")
        if kind == "trip":
            # Trip: keep the listing open; only remove this thread + messages.
            supabase.table("threads").delete().eq("id", thread_id).execute()
        else:
            # Delivery / request: delete the listing, which cascades to the
            # thread, messages, participants and confirmations.
            supabase.table("listings").delete().eq("id", listing["id"]).execute()

        return {"ok": True, "archived": True, "listing_kind": kind}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to close deal: {str(e)}")
