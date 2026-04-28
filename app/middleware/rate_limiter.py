"""Rate limiting middleware using Redis sliding window."""
import time
import logging
from typing import Optional

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# Rate limit configuration per path prefix
RATE_LIMITS = {
    "/api/v1/auth/login": {"requests": 5, "window": 60},      # 5 per minute
    "/api/v1/reports/export": {"requests": 10, "window": 60},  # 10 per minute
    "/api/v1/reports/generate": {"requests": 30, "window": 60},
    "/api/v1/projects/": {"requests": 60, "window": 60},       # default API
    "/api/v1/": {"requests": 120, "window": 60},               # catch-all
}


def _get_limit(path: str) -> dict:
    """Find the most specific rate limit for a path."""
    for prefix, limit in RATE_LIMITS.items():
        if path.startswith(prefix):
            return limit
    return {"requests": 120, "window": 60}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter backed by Redis."""

    def __init__(self, app, redis_url: Optional[str] = None):
        super().__init__(app)
        self._redis = None
        self._redis_url = redis_url or settings.REDIS_URL

    @property
    def redis(self):
        if self._redis is None:
            try:
                import redis as r
                self._redis = r.from_url(
                    self._redis_url, decode_responses=True,
                    socket_connect_timeout=1, socket_timeout=1,
                )
                self._redis.ping()
            except Exception:
                self._redis = None
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        # Get client identifier
        client_ip = request.client.host if request.client else "unknown"
        # Use user ID if authenticated (from JWT)
        client_key = client_ip

        limit = _get_limit(request.url.path)
        max_requests = limit["requests"]
        window = limit["window"]

        # Try Redis-based rate limiting
        if self.redis:
            try:
                key = f"ratelimit:{client_key}:{request.url.path}"
                now = time.time()
                pipe = self.redis.pipeline()
                pipe.zremrangebyscore(key, 0, now - window)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, window)
                results = pipe.execute()
                request_count = results[2]

                if request_count > max_requests:
                    retry_after = int(window - (now - float(self.redis.zrange(key, 0, 0)[0])))
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={"detail": "Rate limit exceeded", "retry_after": max(retry_after, 1)},
                        headers={"Retry-After": str(max(retry_after, 1))},
                    )

                response = await call_next(request)
                response.headers["X-RateLimit-Limit"] = str(max_requests)
                response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - request_count))
                return response
            except Exception as exc:
                logger.debug("Rate limit check failed, allowing request: %s", exc)

        # Fallback: no rate limiting if Redis is unavailable
        return await call_next(request)
