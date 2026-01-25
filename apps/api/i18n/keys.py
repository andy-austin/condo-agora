"""
Translation key constants for API responses.

These keys correspond to translation entries in the frontend's messages files.
The frontend translates these keys based on the user's locale.

Note: Status values (ok, degraded, error) are API constants, not translation keys.
Only user-facing message fields (like 'details') use translation keys.
"""


class StatusValues:
    """API status values (not translation keys - these are API constants)."""

    OK = "ok"
    DEGRADED = "degraded"
    ERROR = "error"
    UNKNOWN = "unknown"


class TranslationKeys:
    """Translation keys for user-facing messages.

    These correspond to entries in the frontend translation files.
    """

    # Database status messages
    DB_CONNECTED = "database.connected"
    DB_DISCONNECTED = "database.disconnected"
    DB_CONNECTION_ERROR = "database.connectionError"
    DB_QUERY_ERROR = "database.queryError"
    DB_UNEXPECTED_RESULT = "database.unexpectedResult"
