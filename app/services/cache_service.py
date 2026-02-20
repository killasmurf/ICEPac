"""Redis-backed cache service."""
import json
import logging
from typing import Any, Optional

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Thin wrapper around Redis for get/set/delete caching.

    All values are JSON-serialised so callers work with plain Python objects.
    The service is intentionally lenient: any Redis error is logged and
    treated as a cache miss so the application keeps running without Redis.
    """

    def __init__(self, url: str = settings.REDIS_URL, default_ttl: int = settings.CACHE_TTL):
        self._url = url
        self._default_ttl = default_ttl
        self._client: Optional[redis.Redis] = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        return self._client

    def get(self, key: str) -> Optional[Any]:
        """Return the cached value for *key*, or ``None`` on miss/error."""
        try:
            raw = self.client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Cache GET error for key '%s': %s", key, exc)
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Store *value* under *key* with an optional TTL (seconds).

        Returns ``True`` on success, ``False`` on error.
        """
        try:
            self.client.setex(
                name=key,
                time=ttl if ttl is not None else self._default_ttl,
                value=json.dumps(value, default=str),
            )
            return True
        except Exception as exc:
            logger.warning("Cache SET error for key '%s': %s", key, exc)
            return False

    def delete(self, key: str) -> bool:
        """Remove a key from the cache. Returns ``True`` on success."""
        try:
            self.client.delete(key)
            return True
        except Exception as exc:
            logger.warning("Cache DELETE error for key '%s': %s", key, exc)
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching *pattern* (e.g. ``'project:*'``).

        Returns the number of keys removed.
        """
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as exc:
            logger.warning("Cache DELETE PATTERN error for '%s': %s", pattern, exc)
            return 0

    def ping(self) -> bool:
        """Return ``True`` if Redis is reachable."""
        try:
            return self.client.ping()
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

cache = CacheService()


# ---------------------------------------------------------------------------
# Convenience key builders
# ---------------------------------------------------------------------------

def project_key(project_id: int) -> str:
    return f"project:{project_id}"


def project_list_key(skip: int, limit: int, active_only: bool) -> str:
    return f"projects:list:{skip}:{limit}:active={active_only}"


def wbs_list_key(project_id: int) -> str:
    return f"project:{project_id}:wbs"
