"""Threads: one conversation per listing + pair of users.

Reads are plain sequential queries. The old fan-out through a thread pool
bought nothing on a local Postgres and hid the actual query count; five
short indexed queries in a row are the whole cost. Response shapes are
unchanged.
"""
from fastapi import APIRouter, Depends, HTTPException
from db import get_conn, fetchone, fetchall
from error_handlers import public_error
from routers.auth import get_current_user

router = APIRouter()


def _anon_profile(other_id: str | None) -> dict:
    return {"id": other_id, "display_name": None, "avatar_url": None}


@router.post("")
async def create_or_get_thread(listing_id: str, user=Depends(get_current_user)):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT owner_id FROM listings WHERE id = %s", (listing_id,))
            listing = fetchone(cur)
            if not listing:
                raise HTTPException(404, "Listing not found")
            owner_id = listing["owner_id"]
            if owner_id == user.id:
                raise HTTPException(400, "Cannot contact your own listing")

            # One query: a thread on this listing with both of us in it.
            cur.execute(
                "SELECT t.* FROM threads t"
                " JOIN thread_participants p1 ON p1.thread_id = t.id AND p1.user_id = %s"
                " JOIN thread_participants p2 ON p2.thread_id = t.id AND p2.user_id = %s"
                " WHERE t.listing_id = %s LIMIT 1",
                (user.id, owner_id, listing_id),
            )
            existing = fetchone(cur)
            if existing:
                return existing

            cur.execute(
                "INSERT INTO threads (listing_id) VALUES (%s) RETURNING *",
                (listing_id,),
            )
            thread = fetchone(cur)
            cur.execute(
                "INSERT INTO thread_participants (thread_id, user_id) VALUES (%s, %s), (%s, %s)",
                (thread["id"], user.id, thread["id"], owner_id),
            )
            return thread
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("create thread", e)


@router.get("")
async def list_threads(user=Depends(get_current_user)):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT thread_id FROM thread_participants WHERE user_id = %s",
                (user.id,),
            )
            participations = fetchall(cur)
            if not participations:
                return []
            thread_ids = [p["thread_id"] for p in participations]

            cur.execute("SELECT * FROM threads WHERE id = ANY(%s)", (thread_ids,))
            threads = fetchall(cur)
            if not threads:
                return []

            cur.execute(
                "SELECT thread_id, user_id FROM thread_participants"
                " WHERE thread_id = ANY(%s)",
                (thread_ids,),
            )
            all_parts = fetchall(cur)

            cur.execute(
                "SELECT id, thread_id, sender_id, body, read_at, created_at,"
                " is_system FROM messages WHERE thread_id = ANY(%s)"
                " ORDER BY created_at",
                (thread_ids,),
            )
            msgs = fetchall(cur)

            thread_to_users: dict[str, list[str]] = {}
            other_user_ids: set[str] = set()
            for p in all_parts:
                tid, uid = p["thread_id"], p["user_id"]
                thread_to_users.setdefault(tid, []).append(uid)
                if uid != user.id:
                    other_user_ids.add(uid)

            thread_messages: dict[str, list] = {}
            for m in msgs:
                thread_messages.setdefault(m["thread_id"], []).append(m)

            profiles_map: dict[str, dict] = {}
            if other_user_ids:
                cur.execute(
                    "SELECT id, display_name, avatar_url FROM profiles"
                    " WHERE id = ANY(%s)",
                    (list(other_user_ids),),
                )
                for p in fetchall(cur):
                    profiles_map[p["id"]] = p

            listings_map: dict[str, dict] = {}
            listing_ids = [t["listing_id"] for t in threads if t.get("listing_id")]
            if listing_ids:
                cur.execute(
                    "SELECT id, title, origin_city, dest_city FROM listings"
                    " WHERE id = ANY(%s)",
                    (listing_ids,),
                )
                for row in fetchall(cur):
                    listings_map[row["id"]] = row

        result = []
        for thread in threads:
            tid = thread["id"]
            lid = thread.get("listing_id")
            listing = listings_map.get(lid, {}) if lid else {}

            other_id = next((uid for uid in thread_to_users.get(tid, []) if uid != user.id), None)
            other_profile = profiles_map.get(other_id) if other_id else None

            thread_msgs = thread_messages.get(tid, [])
            last_msg = thread_msgs[-1] if thread_msgs else None
            # Exclude system messages (sender_id is None) — they are not "from
            # the other party" and the mark-read query won't touch them either.
            unread_count = sum(
                1 for m in thread_msgs
                if m["sender_id"] is not None
                and m["sender_id"] != user.id
                and m["read_at"] is None
            )

            listing_title = listing.get("title") or f"{listing.get('origin_city', '?')} → {listing.get('dest_city', '?')}"

            result.append({
                **thread,
                "listing_title": listing_title,
                "other_participant": other_profile or _anon_profile(other_id),
                "last_message": last_msg,
                "unread_count": unread_count,
            })

        result.sort(
            key=lambda t: (t.get("last_message") or {}).get("created_at") or t["created_at"],
            reverse=True,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("fetch threads", e)


@router.get("/{thread_id}")
async def get_thread(thread_id: str, user=Depends(get_current_user)):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM thread_participants"
                " WHERE thread_id = %s AND user_id = %s",
                (thread_id, user.id),
            )
            if not fetchone(cur):
                raise HTTPException(403, "Not a participant in this thread")

            cur.execute("SELECT * FROM threads WHERE id = %s", (thread_id,))
            thread = fetchone(cur)
            if not thread:
                raise HTTPException(404, "Thread not found")

            cur.execute(
                "SELECT user_id FROM thread_participants WHERE thread_id = %s",
                (thread_id,),
            )
            parts = fetchall(cur)
            other_id = next((p["user_id"] for p in parts if p["user_id"] != user.id), None)

            cur.execute(
                "SELECT * FROM messages WHERE thread_id = %s ORDER BY created_at",
                (thread_id,),
            )
            msgs = fetchall(cur)

            listing = None
            if thread.get("listing_id"):
                cur.execute(
                    "SELECT id, title, origin_city, dest_city, kind, status"
                    " FROM listings WHERE id = %s",
                    (thread["listing_id"],),
                )
                listing = fetchone(cur)

            profile = None
            if other_id:
                cur.execute(
                    "SELECT id, display_name, avatar_url, bio, city, country"
                    " FROM profiles WHERE id = %s",
                    (other_id,),
                )
                profile = fetchone(cur)

        return {
            **thread,
            "listing": listing,
            "other_participant": profile or _anon_profile(other_id),
            "messages": msgs,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("fetch thread", e)
