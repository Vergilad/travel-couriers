"""In-process sliding-window rate limiter for auth endpoints.

Stops casual brute force (signin guessing) and signup spam. Single uvicorn
worker only: with --workers > 1 or multiple hosts this needs a shared
store (Postgres table). Until then, per-process memory is the honest scope.
"""
import time
from collections import deque
from fastapi import HTTPException, Request

_WINDOW_SECONDS = 600.0
_DEFAULT_MAX = 10

_hits: dict[str, deque[float]] = {}


def check_rate_limit(request: Request, scope: str, max_hits: int = _DEFAULT_MAX):
    """Allow max_hits per 10 minutes per client IP, per scope."""
    ip = request.client.host if request.client else "unknown"
    key = f"{scope}:{ip}"
    now = time.monotonic()
    q = _hits.get(key)
    if q is None:
        q = _hits[key] = deque()
    while q and now - q[0] > _WINDOW_SECONDS:
        q.popleft()
    if len(q) >= max_hits:
        raise HTTPException(429, "Too many tries. Wait a few minutes.")
    q.append(now)
