import re
from fastapi import HTTPException
from db import get_conn, fetchone, fetchall

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _table(name: str) -> str:
    """Table/order names come from internal constants, but a malformed one
    would be SQL injection — reject anything that is not a plain identifier."""
    if not _IDENT.match(name or ""):
        raise HTTPException(400, "Invalid table or column name")
    return name


async def get_record_by_id(table: str, record_id: str, fields: str = "*"):
    """Fetch a single record by ID."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT {fields} FROM {_table(table)} WHERE id = %s", (record_id,))
        row = fetchone(cur)
    if not row:
        raise HTTPException(404, f"{table.rstrip('s').title()} not found")
    return row


async def get_records_with_filters(table: str, filters: dict, fields: str = "*", order_by: str = None, desc: bool = True):
    """Fetch records with optional filtering and ordering."""
    where = " AND ".join(f"{_table(k)} = %s" for k in filters)
    sql = f"SELECT {fields} FROM {_table(table)}"
    if where:
        sql += f" WHERE {where}"
    if order_by:
        sql += f" ORDER BY {_table(order_by)} {'DESC' if desc else 'ASC'}"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, tuple(filters.values()))
        return fetchall(cur)
