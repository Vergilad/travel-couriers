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


def _get_delivery_conf(thread_id: str) -> dict | None:
    try:
        res = (
            supabase.table("delivery_confirmations")
            .select("thread_id, courier_id, recipient_id, handed_over_at, received_at")
            .eq("thread_id", thread_id)
            .maybe_single()
            .execute()
        )
        return res.data or None
    except Exception:
        # Table may not exist yet (migration pending) — treat as no record
        return None


def _get_courier_recipient(listing: dict, participant_ids: list[str]) -> tuple[str | None, str | None]:
    """Determine who is the courier (physically transports) and who is the recipient.

    Trip:     listing owner = courier (the traveler), other = sender/recipient of goods
    Delivery: non-owner = courier (they agreed to carry), owner = sender
    Request:  non-owner = courier, owner = requester (recipient of goods)
    """
    owner = listing.get("owner_id")
    kind = listing.get("kind")
    other = next((uid for uid in participant_ids if uid != owner), None)
    if kind == "trip":
        return owner, other      # traveler carries; other receives
    else:
        return other, owner      # non-owner carries; owner is sender/requester


def _derive_stage(listing, me_confirmed: bool, both_confirmed: bool, delivery_conf: dict | None) -> str:
    if not listing:
        return "none"
    status = listing.get("status")
    if status in ("completed", "cancelled"):
        return "completed" if status == "completed" else "none"
    if both_confirmed:
        if delivery_conf:
            if delivery_conf.get("received_at"):
                return "completed"
            if delivery_conf.get("handed_over_at"):
                return "handed_over"
        return "in_transit"
    if me_confirmed:
        return "waiting"
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
        pass  # Non-fatal


@router.post("/confirm")
async def confirm_match(thread_id: str, user=Depends(get_current_user)):
    """Stage 1: both parties confirm the arrangement."""
    _guard()
    try:
        _assert_participant(thread_id, user.id)

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

        if both and len(participant_ids) == 2:
            courier_id, recipient_id = _get_courier_recipient(listing, participant_ids)

            # Create the delivery_confirmations row (idempotent)
            existing_dc = _get_delivery_conf(thread_id)
            if not existing_dc:
                supabase.table("delivery_confirmations").insert({
                    "thread_id": thread_id,
                    "courier_id": courier_id,
                    "recipient_id": recipient_id,
                }).execute()

            # Fetch display names for the system message
            prof_res = (
                supabase.table("profiles")
                .select("id, display_name")
                .in_("id", participant_ids)
                .execute()
            )
            name_map = {p["id"]: (p.get("display_name") or "Traveler") for p in (prof_res.data or [])}
            label_a = name_map.get(participant_ids[0], "Traveler")
            label_b = name_map.get(participant_ids[1], "Traveler")

            _post_system_message(
                thread_id,
                f"✦ {label_a} and {label_b} confirmed the arrangement — you're now connected."
            )
            # Safety tips as a second system message
            _post_system_message(
                thread_id,
                "⚠ A few reminders: always inspect what you're carrying · never pay upfront without verification · "
                "Peregri does not guarantee transactions or mediate disputes · "
                "you can continue this conversation on WhatsApp, Signal, or Telegram if preferred."
            )

        return {
            "status": "in_transit" if both else "waiting",
            "both_confirmed": both,
            "confirmed_by_me": True,
            "listing_kind": kind,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to confirm arrangement: {str(e)}")


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
        me_confirmed = user.id in confirmed_ids
        both = len(confirmed_ids) >= 2 and len(participant_ids) == 2

        delivery_conf = _get_delivery_conf(thread_id)
        stage = _derive_stage(listing, me_confirmed, both, delivery_conf)

        courier_id, recipient_id = (None, None)
        if listing and len(participant_ids) == 2:
            courier_id, recipient_id = _get_courier_recipient(listing, participant_ids)
        # Fall back to delivery_conf if available (more reliable after archiving)
        if delivery_conf:
            courier_id = delivery_conf.get("courier_id") or courier_id
            recipient_id = delivery_conf.get("recipient_id") or recipient_id

        return {
            "stage": stage,
            "me_confirmed": me_confirmed,
            "other_confirmed": any(uid in confirmed_ids for uid in participant_ids if uid != user.id),
            "both_confirmed": both,
            "listing_kind": listing.get("kind") if listing else None,
            "listing_status": listing.get("status") if listing else None,
            "courier_id": courier_id,
            "recipient_id": recipient_id,
            "is_me_courier": user.id == courier_id,
            "handed_over": bool(delivery_conf and delivery_conf.get("handed_over_at")),
            "received": bool(delivery_conf and delivery_conf.get("received_at")),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch match state: {str(e)}")


@router.post("/handover")
async def mark_handover(thread_id: str, user=Depends(get_current_user)):
    """Courier marks the item as handed over (non-binding progress signal)."""
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        _, listing, participant_ids = _get_thread_context(thread_id)

        if not _both_confirmed(thread_id):
            raise HTTPException(400, "Both parties must confirm the arrangement first")

        delivery_conf = _get_delivery_conf(thread_id)
        if not delivery_conf:
            raise HTTPException(400, "Delivery record not found — arrangement not confirmed yet")
        if delivery_conf.get("courier_id") != user.id:
            raise HTTPException(403, "Only the courier can mark the item as handed over")
        if delivery_conf.get("handed_over_at"):
            raise HTTPException(400, "Already marked as handed over")

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("delivery_confirmations").update({
            "handed_over_at": now,
        }).eq("thread_id", thread_id).execute()

        _post_system_message(
            thread_id,
            "✦ Courier marked the item as handed over — waiting for receipt confirmation."
        )

        return {"ok": True, "handed_over": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to mark handover: {str(e)}")


@router.post("/received")
async def mark_received(thread_id: str, user=Depends(get_current_user)):
    """Recipient confirms receipt — this is the binding completion event.
    Archives to completed_deals, sets listing status to 'completed' (non-trip)
    or leaves listing open (trip). Thread and messages are NEVER deleted.
    """
    _guard()
    try:
        _assert_participant(thread_id, user.id)
        thread, listing, participant_ids = _get_thread_context(thread_id)

        if not listing:
            raise HTTPException(400, "Thread has no associated listing")
        if not _both_confirmed(thread_id):
            raise HTTPException(400, "Both parties must confirm the arrangement first")

        delivery_conf = _get_delivery_conf(thread_id)
        if not delivery_conf:
            raise HTTPException(400, "Delivery record not found")
        if delivery_conf.get("recipient_id") != user.id:
            raise HTTPException(403, "Only the recipient can confirm receipt")
        if delivery_conf.get("received_at"):
            raise HTTPException(400, "Receipt already confirmed")

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        # Mark received
        supabase.table("delivery_confirmations").update({
            "received_at": now,
        }).eq("thread_id", thread_id).execute()

        # Snapshot both participants to completed_deals
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

        # Mark listing as completed (non-trip) — trip stays open for other senders
        kind = listing.get("kind")
        if kind != "trip":
            supabase.table("listings").update({"status": "completed"}).eq("id", listing["id"]).execute()

        _post_system_message(
            thread_id,
            "✦ Delivery confirmed — this arrangement is complete. "
            "You can now leave a review on each other's profiles."
        )

        return {"ok": True, "completed": True, "listing_kind": kind}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to confirm receipt: {str(e)}")


@router.post("/close-deal")
async def close_deal_deprecated(thread_id: str, user=Depends(get_current_user)):
    """Deprecated — use /received instead. Returns a clear error."""
    raise HTTPException(410, "This endpoint is retired. Use POST /api/matches/received to complete a delivery.")
