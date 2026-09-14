from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from db import get_conn, fetchone, fetchall
from error_handlers import public_error
from models import MessageCreate
from routers.auth import get_current_user

router = APIRouter()


def _assert_participant(thread_id: str, user_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM thread_participants"
            " WHERE thread_id = %s AND user_id = %s",
            (thread_id, user_id),
        )
        if not fetchone(cur):
            raise HTTPException(403, "Not a participant in this thread")


@router.get("/{thread_id}")
async def get_messages(thread_id: str, user=Depends(get_current_user)):
    try:
        _assert_participant(thread_id, user.id)
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM messages WHERE thread_id = %s ORDER BY created_at",
                (thread_id,),
            )
            return fetchall(cur)
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("fetch messages", e)


@router.post("")
async def send_message(body: MessageCreate, user=Depends(get_current_user)):
    try:
        _assert_participant(body.thread_id, user.id)
        text = body.body.strip()
        if not text:
            raise HTTPException(400, "Message body cannot be empty")
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (thread_id, sender_id, body, is_system)"
                " VALUES (%s, %s, %s, FALSE) RETURNING *",
                (body.thread_id, user.id, text),
            )
            return fetchone(cur)
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("send message", e)


@router.patch("/thread/{thread_id}/read")
async def mark_thread_read(thread_id: str, user=Depends(get_current_user)):
    try:
        _assert_participant(thread_id, user.id)
        now = datetime.now(timezone.utc).isoformat()
        # Mark unread messages from the other party as read. System messages
        # (sender_id NULL) are auto-read and never count toward unread
        # (`<>` excludes NULL the same way the old filter did).
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE messages SET read_at = %s WHERE thread_id = %s"
                " AND sender_id <> %s AND read_at IS NULL",
                (now, thread_id, user.id),
            )
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise public_error("mark as read", e)
