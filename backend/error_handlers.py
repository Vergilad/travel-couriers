import logging
from functools import wraps
from fastapi import HTTPException

log = logging.getLogger("peregri")


def public_error(action: str, e: Exception) -> HTTPException:
    """Log the real cause server-side; the client only gets a generic line.

    Every `except` that used to return str(e) goes through here: SQL and
    filesystem details must never reach the browser.
    """
    log.exception("Failed to %s", action)
    return HTTPException(400, f"Failed to {action}. Try again.")


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
                raise public_error(action, e)
        return wrapper
    return decorator
