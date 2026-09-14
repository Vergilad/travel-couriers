from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import secrets
from db import get_conn, fetchone, fetchall
from error_handlers import public_error
from models import HandoverCodeSubmit
from routers.auth import get_current_user

router = APIRouter()

# Wrong code tries before the handover code locks (needer regenerates).
MAX_CODE_ATTEMPTS = 5


def _mint_handover_code() -> str:
    """Six digits, zero-padded. Told in person, typed by the courier."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _assert_participant(thread_id: str, user_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM thread_participants"
            " WHERE thread_id = %s AND user_id = %s",
            (thread_id, user_id),
        )
        if not fetchone(cur):
            raise HTTPException(403, "Not a participant in this thread")


def _get_thread_context(thread_id: str):
    """Return (thread, listing, participant_ids) for a thread."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, listing_id FROM threads WHERE id = %s", (thread_id,)
        )
        thread = fetchone(cur)
        if not thread:
            raise HTTPException(404, "Thread not found")

        listing = None
        if thread.get("listing_id"):
            cur.execute(
                "SELECT id, kind, status, owner_id, origin_city, origin_country,"
                " dest_city, dest_country, depart_date, arrive_date, price, currency"
                " FROM listings WHERE id = %s",
                (thread["listing_id"],),
            )
            listing = fetchone(cur)

        cur.execute(
            "SELECT user_id FROM thread_participants WHERE thread_id = %s",
            (thread_id,),
        )
        participant_ids = [p["user_id"] for p in fetchall(cur)]
    return thread, listing, participant_ids


def _both_confirmed(thread_id: str) -> bool:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM match_confirmations WHERE thread_id = %s",
            (thread_id,),
        )
        confs = fetchall(cur)
    return bool(confs) and len(confs) >= 2


def _get_delivery_conf(thread_id: str) -> dict | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT thread_id, courier_id, recipient_id, handed_over_at, received_at,"
            " handover_code, code_attempts"
            " FROM delivery_confirmations WHERE thread_id = %s",
            (thread_id,),
        )
        return fetchone(cur)


def _archive_completion(thread_id: str, listing: dict, participant_ids: list[str]) -> str:
    """Binding completion: mark received, snapshot both parties to
    completed_deals, close non-carry listings, burn the handover code.
    One transaction; shared by mark_received and complete_with_code."""
    now = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn, conn.cursor() as cur:
        # Mark received (runs inside this transaction: a closed-cursor
        # indent bug here once 400d every need completion).
        cur.execute(
            "UPDATE delivery_confirmations SET received_at = %s,"
            " handover_code = NULL, code_attempts = 0"
            " WHERE thread_id = %s",
            (now, thread_id),
        )

        # Snapshot both participants to completed_deals
        cur.execute(
            "SELECT id, display_name, avatar_url FROM profiles"
            " WHERE id = ANY(%s)",
            (participant_ids,),
        )
        prof_map = {p["id"]: p for p in fetchall(cur)}
        user_a_id = participant_ids[0]
        user_b_id = participant_ids[1]
        a = prof_map.get(user_a_id, {})
        b = prof_map.get(user_b_id, {})

        cur.execute(
            "INSERT INTO completed_deals (listing_id, kind, origin_city,"
            " origin_country, dest_city, dest_country, depart_date,"
            " arrive_date, user_a, user_b, user_a_name, user_a_avatar,"
            " user_b_name, user_b_avatar)"
            " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                listing.get("id"), listing.get("kind"),
                listing.get("origin_city"), listing.get("origin_country"),
                listing.get("dest_city"), listing.get("dest_country"),
                listing.get("depart_date"), listing.get("arrive_date"),
                user_a_id, user_b_id,
                a.get("display_name"), a.get("avatar_url"),
                b.get("display_name"), b.get("avatar_url"),
            ),
        )

        # Mark listing as completed (non-carry) — carry stays open.
        kind = listing.get("kind")
        if kind != "carry":
            cur.execute(
                "UPDATE listings SET status = 'completed' WHERE id = %s",
                (listing["id"],),
            )
    return kind


def _get_courier_recipient(listing: dict, participant_ids: list[str]) -> tuple[str | None, str | None]:
    """Determine who is the courier (physically transports) and who is the recipient.

    Carry: listing owner = courier (the traveler), other = sender/recipient of goods
    Need:  non-owner = courier (they agreed to carry), owner = sender
    """
    owner = listing.get("owner_id")
    kind = listing.get("kind")
    other = next((uid for uid in participant_ids if uid != owner), None)
    if kind == "carry":
        return owner, other      # traveler carries; other receives
    else:
        return other, owner      # non-owner carries; owner is sender


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
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (thread_id, sender_id, body, is_system)"
                " VALUES (%s, NULL, %s, TRUE)",
                (thread_id, body),
            )
    except Exception:
        pass  # Non-fatal


@router.post("/confirm")
async def confirm_match(thread_id: str, user=Depends(get_current_user)):
    """Stage 1: both parties confirm the arrangement."""
    try:
        _assert_participant(thread_id, user.id)

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM match_confirmations"
                " WHERE thread_id = %s AND user_id = %s",
                (thread_id, user.id),
            )
            if not fetchone(cur):
                # One transaction: record the confirmation and, when both
                # sides are in, create the delivery row. Single writer, no
                # concurrent PostgREST clients, so no trigger needed.
                cur.execute(
                    "INSERT INTO match_confirmations (thread_id, user_id)"
                    " VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (thread_id, user.id),
                )

        thread, listing, participant_ids = _get_thread_context(thread_id)
        both = _both_confirmed(thread_id)
        kind = listing.get("kind") if listing else None
        handover_code = None
        recipient_id = None

        if both and len(participant_ids) == 2:
            courier_id, recipient_id = _get_courier_recipient(listing, participant_ids)

            # Create the delivery_confirmations row (idempotent)
            existing_dc = _get_delivery_conf(thread_id)
            if not existing_dc:
                with get_conn() as conn, conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO delivery_confirmations"
                        " (thread_id, courier_id, recipient_id)"
                        " VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (thread_id, courier_id, recipient_id),
                    )
                existing_dc = _get_delivery_conf(thread_id)

            # Mint the handover code once. Visible to the needer
            # (recipient) only: never posted to chat, never to the courier.
            handover_code = (existing_dc or {}).get("handover_code")
            if not handover_code:
                handover_code = _mint_handover_code()
                with get_conn() as conn, conn.cursor() as cur:
                    cur.execute(
                        "UPDATE delivery_confirmations SET handover_code = %s,"
                        " code_attempts = 0 WHERE thread_id = %s",
                        (handover_code, thread_id),
                    )

            # Fetch display names for the system message
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(
                    "SELECT id, display_name FROM profiles WHERE id = ANY(%s)",
                    (participant_ids,),
                )
                profs = fetchall(cur)
            name_map = {p["id"]: (p.get("display_name") or "Traveler") for p in profs}
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
            "handover_code": handover_code if user.id == recipient_id else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("confirm arrangement", e)


@router.get("")
async def get_match_state(thread_id: str, user=Depends(get_current_user)):
    try:
        _assert_participant(thread_id, user.id)
        thread, listing, participant_ids = _get_thread_context(thread_id)

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM match_confirmations WHERE thread_id = %s",
                (thread_id,),
            )
            confirmed_ids = {c["user_id"] for c in fetchall(cur)}
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
            "is_me_needer": recipient_id is not None and user.id == recipient_id,
            "handover_code": delivery_conf.get("handover_code") if (delivery_conf and user.id == recipient_id) else None,
            "code_locked": bool(delivery_conf) and (delivery_conf.get("code_attempts") or 0) >= MAX_CODE_ATTEMPTS,
            "handed_over": bool(delivery_conf and delivery_conf.get("handed_over_at")),
            "received": bool(delivery_conf and delivery_conf.get("received_at")),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("fetch match state", e)


@router.post("/handover")
async def mark_handover(thread_id: str, user=Depends(get_current_user)):
    """Courier marks the item as handed over (non-binding progress signal)."""
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

        now = datetime.now(timezone.utc).isoformat()
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE delivery_confirmations SET handed_over_at = %s"
                " WHERE thread_id = %s",
                (now, thread_id),
            )

        _post_system_message(
            thread_id,
            "✦ Courier marked the item as handed over — waiting for receipt confirmation."
        )

        return {"ok": True, "handed_over": True}
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("mark handover", e)


@router.post("/received")
async def mark_received(thread_id: str, user=Depends(get_current_user)):
    """Recipient confirms receipt — this is the binding completion event.
    Archives to completed_deals, sets listing status to 'completed' (non-carry)
    or leaves listing open (carry). Thread and messages are NEVER deleted.
    """
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

        kind = _archive_completion(thread_id, listing, participant_ids)

        _post_system_message(
            thread_id,
            "✦ Delivery confirmed — this arrangement is complete. "
            "You can now leave a review on each other's profiles."
        )

        return {"ok": True, "completed": True, "listing_kind": kind}
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("confirm receipt", e)


@router.post("/complete-with-code")
async def complete_with_code(payload: HandoverCodeSubmit, user=Depends(get_current_user)):
    """Courier enters the needer's handover code: the binding completion
    event. Same snapshot as mark_received; replaces the recipient click."""
    try:
        _assert_participant(payload.thread_id, user.id)
        thread, listing, participant_ids = _get_thread_context(payload.thread_id)

        if not listing:
            raise HTTPException(400, "Thread has no associated listing")
        if not _both_confirmed(payload.thread_id):
            raise HTTPException(400, "Both parties must confirm the arrangement first")

        delivery_conf = _get_delivery_conf(payload.thread_id)
        if not delivery_conf:
            raise HTTPException(400, "Delivery record not found")
        if delivery_conf.get("received_at"):
            raise HTTPException(400, "Receipt already confirmed")
        if delivery_conf.get("courier_id") != user.id:
            raise HTTPException(403, "Only the courier can enter the handover code")
        if not delivery_conf.get("handover_code"):
            raise HTTPException(400, "No active handover code for this thread")

        attempts = delivery_conf.get("code_attempts") or 0
        if attempts >= MAX_CODE_ATTEMPTS:
            raise HTTPException(403, "Too many wrong tries. Ask the other party for a new code.")

        if payload.code.strip() != delivery_conf["handover_code"]:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(
                    "UPDATE delivery_confirmations SET code_attempts = code_attempts + 1"
                    " WHERE thread_id = %s",
                    (payload.thread_id,),
                )
            left = MAX_CODE_ATTEMPTS - attempts - 1
            raise HTTPException(400, f"Wrong code. {left} tries left.")

        kind = _archive_completion(payload.thread_id, listing, participant_ids)

        _post_system_message(
            payload.thread_id,
            "✦ Courier entered the handover code. Delivery confirmed. "
            "You can now leave a review on each other's profiles."
        )

        return {"ok": True, "completed": True, "listing_kind": kind}
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("complete with code", e)


@router.post("/regenerate-code")
async def regenerate_code(thread_id: str, user=Depends(get_current_user)):
    """Needer lost the code or it locked: mint a fresh one, old dies."""
    try:
        _assert_participant(thread_id, user.id)
        _, listing, participant_ids = _get_thread_context(thread_id)

        if not listing or not _both_confirmed(thread_id):
            raise HTTPException(400, "Arrangement is not confirmed yet")

        delivery_conf = _get_delivery_conf(thread_id)
        if not delivery_conf:
            raise HTTPException(400, "Delivery record not found")
        if delivery_conf.get("received_at"):
            raise HTTPException(400, "Deal is already completed")
        if delivery_conf.get("recipient_id") != user.id:
            raise HTTPException(403, "Only the needer can see a new code")

        code = _mint_handover_code()
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE delivery_confirmations SET handover_code = %s, code_attempts = 0"
                " WHERE thread_id = %s",
                (code, thread_id),
            )
        return {"handover_code": code}
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("regenerate code", e)
