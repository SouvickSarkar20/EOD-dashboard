from collections import defaultdict
from time import time
from fastapi import HTTPException, status, Request

_request_history = defaultdict(list)

def rate_limit_auth(max_requests: int = 10, window_seconds: int = 60):
    """
    Dependency to rate-limit sensitive authentication endpoints.
    Allows up to `max_requests` per IP within `window_seconds`.
    """
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time()
        history = _request_history[client_ip]
        # Remove timestamps outside the sliding window
        _request_history[client_ip] = [t for t in history if now - t < window_seconds]
        if len(_request_history[client_ip]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many authentication attempts. Please wait 60 seconds before trying again."
            )
        _request_history[client_ip].append(now)
    return dependency
