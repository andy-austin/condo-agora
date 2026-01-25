from datetime import datetime, timezone
from typing import Any, Dict

from ..database import get_db
from ..i18n import StatusValues, TranslationKeys


class HealthResolver:
    @classmethod
    async def get_health_status(cls) -> Dict[str, Any]:
        """Get comprehensive health status including database connectivity.

        Status fields use API constants (ok, degraded, error).
        Details field uses translation keys for user-facing messages.
        """
        health_data = {
            "status": StatusValues.OK,
            "timestamp": datetime.now(timezone.utc),
            "api": {"status": StatusValues.OK},
            "database": {
                "status": StatusValues.UNKNOWN,
                "connection": False,
                "details": None,
            },
        }

        # Check database connectivity
        try:
            db = await get_db()
            try:
                # Simple query to test connection
                # query_raw returns a list of dicts
                result = await db.query_raw("SELECT 1")
                if result:
                    health_data["database"]["status"] = StatusValues.OK
                    health_data["database"]["connection"] = True
                    health_data["database"]["details"] = TranslationKeys.DB_CONNECTED
                else:
                    health_data["database"]["status"] = StatusValues.ERROR
                    health_data["database"][
                        "details"
                    ] = TranslationKeys.DB_UNEXPECTED_RESULT
                    health_data["status"] = StatusValues.DEGRADED
            except Exception as db_error:
                health_data["database"]["status"] = StatusValues.ERROR
                health_data["database"][
                    "details"
                ] = f"{TranslationKeys.DB_QUERY_ERROR}: {str(db_error)}"
                health_data["status"] = StatusValues.ERROR
        except Exception as connection_error:
            health_data["database"]["status"] = StatusValues.ERROR
            health_data["database"][
                "details"
            ] = f"{TranslationKeys.DB_CONNECTION_ERROR}: {str(connection_error)}"
            health_data["status"] = StatusValues.ERROR

        return health_data
