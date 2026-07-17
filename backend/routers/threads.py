import asyncio
from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user

def _run(fn):
    """Run a synchronous supabase call in a thread so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(None, fn)

router = APIRouter()


def _guard():
    if not supabase:
        raise HTTPException(503, "Database not configured")


@router.post("")
async def create_or_get_thread(listing_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        listing = supabase.table("listings").select("owner_id").eq("id", listing_id).single().execute()
        if not listing.data:
            raise HTTPException(404, "Listing not found")
        owner_id = listing.data["owner_id"]
        if owner_id == user.id:
            raise HTTPException(400, "Cannot contact your own listing")

        # Check if thread already exists for this listing + these two users
        existing = supabase.table("thread_participants").select("thread_id").eq("user_id", user.id).execute()
        if existing.data:
            for p in existing.data:
                tid = p["thread_id"]
                t = supabase.table("threads").select("*").eq("id", tid).eq("listing_id", listing_id).execute()
                if t.data:
                    return t.data[0]

        # Create new thread
        thread = supabase.table("threads").insert({"listing_id": listing_id}).execute()
        thread_id = thread.data[0]["id"]
        supabase.table("thread_participants").insert([
            {"thread_id": thread_id, "user_id": user.id},
            {"thread_id": thread_id, "user_id": owner_id},
        ]).execute()
        return thread.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to create thread: {str(e)}")


@router.get("")
async def list_threads(user=Depends(get_current_user)):
    _guard()
    try:
        # Round 1: get thread IDs the user belongs to
        participations = supabase.table("thread_participants").select("thread_id").eq("user_id", user.id).execute()
        if not participations.data:
            return []
        thread_ids = [p["thread_id"] for p in participations.data]

        # Round 2: threads + all participants + messages — all independent, run in parallel
        threads_res, all_parts_res, msgs_res = await asyncio.gather(
            _run(lambda: supabase.table("threads").select("*").in_("id", thread_ids).execute()),
            _run(lambda: supabase.table("thread_participants").select("thread_id, user_id").in_("thread_id", thread_ids).execute()),
            _run(lambda: supabase.table("messages").select("id, thread_id, sender_id, body, read_at, created_at, is_system").in_("thread_id", thread_ids).order("created_at").execute()),
        )
        if not threads_res.data:
            return []
        threads = threads_res.data

        thread_to_users: dict[str, list[str]] = {}
        other_user_ids: set[str] = set()
        for p in (all_parts_res.data or []):
            tid, uid = p["thread_id"], p["user_id"]
            thread_to_users.setdefault(tid, []).append(uid)
            if uid != user.id:
                other_user_ids.add(uid)

        thread_messages: dict[str, list] = {}
        for m in (msgs_res.data or []):
            thread_messages.setdefault(m["thread_id"], []).append(m)

        # Round 3: profiles + listings — independent, run in parallel
        listing_ids = [t["listing_id"] for t in threads if t.get("listing_id")]
        prof_task = _run(lambda: supabase.table("profiles").select("id, display_name, avatar_url").in_("id", list(other_user_ids)).execute()) if other_user_ids else asyncio.sleep(0)
        list_task = _run(lambda: supabase.table("listings").select("id, title, origin_city, dest_city").in_("id", listing_ids).execute()) if listing_ids else asyncio.sleep(0)
        prof_res, list_res = await asyncio.gather(prof_task, list_task)

        profiles_map: dict[str, dict] = {}
        for p in (getattr(prof_res, "data", None) or []):
            profiles_map[p["id"]] = p

        listings_map: dict[str, dict] = {}
        for l in (getattr(list_res, "data", None) or []):
            listings_map[l["id"]] = l

        # Assemble
        result = []
        for thread in threads:
            tid = thread["id"]
            lid = thread.get("listing_id")
            listing = listings_map.get(lid, {}) if lid else {}

            other_id = next((uid for uid in thread_to_users.get(tid, []) if uid != user.id), None)
            other_profile = profiles_map.get(other_id) if other_id else None

            msgs = thread_messages.get(tid, [])
            last_msg = msgs[-1] if msgs else None
            # Exclude system messages (sender_id is None) — they are not "from
            # the other party" and the SQL mark-read query won't touch them
            # either (NULL != user.id is NULL/unknown in SQL, not True).
            unread_count = sum(
                1 for m in msgs
                if m["sender_id"] is not None
                and m["sender_id"] != user.id
                and m["read_at"] is None
            )

            listing_title = listing.get("title") or f"{listing.get('origin_city', '?')} → {listing.get('dest_city', '?')}"

            result.append({
                **thread,
                "listing_title": listing_title,
                "other_participant": other_profile or {"id": other_id, "display_name": None, "avatar_url": None},
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
        raise HTTPException(400, f"Failed to fetch threads: {str(e)}")


@router.get("/{thread_id}")
async def get_thread(thread_id: str, user=Depends(get_current_user)):
    _guard()
    try:
        # Round 1: verify participation + fetch thread + messages — all independent
        check_res, thread_res, parts_res, msgs_res = await asyncio.gather(
            _run(lambda: supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).eq("user_id", user.id).execute()),
            _run(lambda: supabase.table("threads").select("*").eq("id", thread_id).single().execute()),
            _run(lambda: supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).execute()),
            _run(lambda: supabase.table("messages").select("*").eq("thread_id", thread_id).order("created_at").execute()),
        )

        if not check_res.data:
            raise HTTPException(403, "Not a participant in this thread")
        if not thread_res.data:
            raise HTTPException(404, "Thread not found")
        thread = thread_res.data

        other_id = next((p["user_id"] for p in (parts_res.data or []) if p["user_id"] != user.id), None)

        # Round 2: listing + other profile — independent, run in parallel
        listing_task = _run(lambda: supabase.table("listings").select("id, title, origin_city, dest_city, kind, status").eq("id", thread["listing_id"]).single().execute()) if thread.get("listing_id") else asyncio.sleep(0)
        profile_task = _run(lambda: supabase.table("profiles").select("id, display_name, avatar_url, bio, city, country").eq("id", other_id).single().execute()) if other_id else asyncio.sleep(0)
        listing_res, profile_res = await asyncio.gather(listing_task, profile_task)

        return {
            **thread,
            "listing": getattr(listing_res, "data", None),
            "other_participant": getattr(profile_res, "data", None) or {"id": other_id, "display_name": None, "avatar_url": None},
            "messages": msgs_res.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch thread: {str(e)}")
