from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
import os

DATABASE_URL = os.environ.get("DATABASE_URL")

pool: ConnectionPool | None = None

if DATABASE_URL:
    pool = ConnectionPool(
        DATABASE_URL,
        min_size=1,
        max_size=10,
        kwargs={"row_factory": dict_row},
    )


def get_conn():
    """Borrow a connection from the pool. Use as `with get_conn() as conn:`.

    psycopg3 connections are transactions by default: the block commits
    on clean exit and rolls back on exception. No manual commit calls.
    """
    if pool is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not configured")
    return pool.connection()


def to_json(row: dict | None) -> dict | None:
    """Convert driver types to JSON-safe values (what supabase-py returned:
    UUIDs as strings, dates as ISO strings, NUMERIC as float)."""
    if row is None:
        return None
    out = {}
    for key, value in row.items():
        if isinstance(value, UUID):
            value = str(value)
        elif isinstance(value, (datetime, date)):
            value = value.isoformat()
        elif isinstance(value, Decimal):
            value = float(value)
        out[key] = value
    return out


def fetchone(cur):
    return to_json(cur.fetchone())


def fetchall(cur):
    return [to_json(row) for row in cur.fetchall()]
