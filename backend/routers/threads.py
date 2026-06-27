from fastapi import APIRouter, Depends, HTTPException
from db import supabase
from routers.auth import get_current_user

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
        # 1. Thread IDs for current user
        participations = supabase.table("thread_participants").select("thread_id").eq("user_id", user.id).execute()
        if not participations.data:
            return []
        thread_ids = [p["thread_id"] for p in participations.data]

        # 2. Threads
        threads_res = supabase.table("threads").select("*").in_("id", thread_ids).execute()
        if not threads_res.data:
            return []
        threads = threads_res.data

        # 3. All participants for these threads (batch)
        all_parts = supabase.table("thread_participants").select("thread_id, user_id").in_("thread_id", thread_ids).execute()
        thread_to_users: dict[str, list[str]] = {}
        other_user_ids: set[str] = set()
        for p in (all_parts.data or []):
            tid, uid = p["thread_id"], p["user_id"]
            thread_to_users.setdefault(tid, []).append(uid)
            if uid != user.id:
                other_user_ids.add(uid)

        # 4. Profiles of other participants (batch)
        profiles_map: dict[str, dict] = {}
        if other_user_ids:
            prof_res = supabase.table("profiles").select("id, display_name, avatar_url").in_("id", list(other_user_ids)).execute()
            for p in (prof_res.data or []):
                profiles_map[p["id"]] = p

        # 5. Listings (batch)
        listing_ids = [t["listing_id"] for t in threads if t.get("listing_id")]
        listings_map: dict[str, dict] = {}
        if listing_ids:
            list_res = supabase.table("listings").select("id, title, origin_city, dest_city").in_("id", listing_ids).execute()
            for l in (list_res.data or []):
                listings_map[l["id"]] = l

        # 6. All messages for these threads (batch — avoid N+1)
        msgs_res = supabase.table("messages").select("id, thread_id, sender_id, body, read_at, created_at").in_("thread_id", thread_ids).order("created_at").execute()
        thread_messages: dict[str, list] = {}
        for m in (msgs_res.data or []):
            thread_messages.setdefault(m["thread_id"], []).append(m)

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
            unread_count = sum(1 for m in msgs if m["sender_id"] != user.id and m["read_at"] is None)

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
        # Verify participant
        check = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).eq("user_id", user.id).execute()
        if not check.data:
            raise HTTPException(403, "Not a participant in this thread")

        thread_res = supabase.table("threads").select("*").eq("id", thread_id).single().execute()
        if not thread_res.data:
            raise HTTPException(404, "Thread not found")
        thread = thread_res.data

        # Listing
        listing = None
        if thread.get("listing_id"):
            l = supabase.table("listings").select("id, title, origin_city, dest_city, kind, status").eq("id", thread["listing_id"]).single().execute()
            listing = l.data

        # Other participant
        parts_res = supabase.table("thread_participants").select("user_id").eq("thread_id", thread_id).execute()
        other_id = next((p["user_id"] for p in (parts_res.data or []) if p["user_id"] != user.id), None)

        other_profile = None
        if other_id:
            p = supabase.table("profiles").select("id, display_name, avatar_url, bio, city, country").eq("id", other_id).single().execute()
            other_profile = p.data

        # Messages (ordered)
        msgs_res = supabase.table("messages").select("*").eq("thread_id", thread_id).order("created_at").execute()

        return {
            **thread,
            "listing": listing,
            "other_participant": other_profile or {"id": other_id, "display_name": None, "avatar_url": None},
            "messages": msgs_res.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch thread: {str(e)}")
