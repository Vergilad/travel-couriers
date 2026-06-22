from fastapi import HTTPException
from db import supabase
from db_constants import Tables


async def get_record_by_id(table: str, record_id: str, fields: str = "*"):
    """Fetch a single record by ID."""
    result = supabase.table(table).select(fields).eq("id", record_id).single().execute()
    if not result.data:
        raise HTTPException(404, f"{table.rstrip('s').title()} not found")
    return result.data


async def get_records_with_filters(table: str, filters: dict, fields: str = "*", order_by: str = None, desc: bool = True):
    """Fetch records with optional filtering and ordering."""
    query = supabase.table(table).select(fields)
    for field, value in filters.items():
        query = query.eq(field, value)
    if order_by:
        query = query.order(order_by, desc=desc)
    result = query.execute()
    return result.data
