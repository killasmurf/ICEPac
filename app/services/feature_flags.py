"""Feature flag service for controlling circuit availability."""
from typing import Dict, Optional

from app.core.config import settings
from app.services.cache_service import cache


# Default flags - all circuits enabled since all phases are complete
DEFAULT_FLAGS: Dict[str, bool] = {
    "circuit.help": True,
    "circuit.admin": True,
    "circuit.projects": True,
    "circuit.estimation": True,
    "circuit.reports": True,
    "feature.async_reports": True,
    "feature.s3_storage": True,
    "feature.risk_management": True,
    "feature.approval_workflow": True,
    "feature.export_pdf": True,
    "feature.export_xlsx": True,
    "feature.export_docx": True,
    "feature.export_csv": True,
}


class FeatureFlagService:
    """Simple feature flag service backed by Redis cache with defaults."""

    CACHE_KEY = "feature_flags"

    def is_enabled(self, flag: str) -> bool:
        """Check if a feature flag is enabled."""
        flags = self._get_flags()
        return flags.get(flag, DEFAULT_FLAGS.get(flag, False))

    def set_flag(self, flag: str, enabled: bool) -> None:
        """Set a feature flag value."""
        flags = self._get_flags()
        flags[flag] = enabled
        cache.set(self.CACHE_KEY, flags, ttl=3600)

    def get_all(self) -> Dict[str, bool]:
        """Return all flags with current values."""
        flags = DEFAULT_FLAGS.copy()
        cached = cache.get(self.CACHE_KEY)
        if cached and isinstance(cached, dict):
            flags.update(cached)
        return flags

    def reset(self) -> None:
        """Reset all flags to defaults."""
        cache.delete(self.CACHE_KEY)

    def _get_flags(self) -> Dict[str, bool]:
        cached = cache.get(self.CACHE_KEY)
        if cached and isinstance(cached, dict):
            return {**DEFAULT_FLAGS, **cached}
        return DEFAULT_FLAGS.copy()


feature_flags = FeatureFlagService()
