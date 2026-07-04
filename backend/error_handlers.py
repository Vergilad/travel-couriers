from functools import wraps
from fastapi import HTTPException


def handle_db_errors(action: str):
    """Decorator to centralize database error handling across routers."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(400, f"Failed to {action}: {str(e)}")
        return wrapper
    return decorator
