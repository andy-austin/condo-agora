"""
i18n module for translation keys and status values.

- StatusValues: API constants for status fields (ok, degraded, error)
- TranslationKeys: Keys for user-facing messages (translated by frontend)
"""

from .keys import StatusValues, TranslationKeys

__all__ = ["StatusValues", "TranslationKeys"]
