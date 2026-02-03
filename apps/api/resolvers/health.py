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
                # Use MongoDB health check (ping command)
                is_healthy = await db.health_check()
                if is_healthy:
                    health_data["database"]["status"] = StatusValues.OK
                    health_data["database"]["connection"] = True
                    health_data["database"]["details"] = TranslationKeys.DB_CONNECTED
                else:
                    health_data["database"]["status"] = StatusValues.ERROR
                    health_data["database"][
                        "details"
                    ] = TranslationKeys.DB_UNEXPECTED_RESULT
                    health_data["status"] = StatusValues.DEGRADED
            except Exception:
                health_data["database"]["status"] = StatusValues.ERROR
                health_data["database"]["details"] = TranslationKeys.DB_QUERY_ERROR
                health_data["status"] = StatusValues.ERROR
        except Exception:
            health_data["database"]["status"] = StatusValues.ERROR
            health_data["database"]["details"] = TranslationKeys.DB_CONNECTION_ERROR
            health_data["status"] = StatusValues.ERROR

        return health_data
