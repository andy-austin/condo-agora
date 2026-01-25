from datetime import datetime, timezone
from typing import Any, Dict

from ..database import get_db


class HealthResolver:
    @classmethod
    async def get_health_status(cls) -> Dict[str, Any]:
        """Get comprehensive health status including database connectivity"""
        health_data = {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc),
            "api": {"status": "ok"},
            "database": {"status": "unknown", "connection": False, "details": None},
        }

        # Check database connectivity
        try:
            db = await get_db()
            try:
                # Simple query to test connection
                # query_raw returns a list of dicts
                result = await db.query_raw("SELECT 1")
                if result:
                    health_data["database"]["status"] = "ok"
                    health_data["database"]["connection"] = True
                    health_data["database"]["details"] = "Connected successfully"
                else:
                    health_data["database"]["status"] = "error"
                    health_data["database"]["details"] = "Unexpected query result"
                    health_data["status"] = "degraded"
            except Exception as db_error:
                health_data["database"]["status"] = "error"
                health_data["database"]["details"] = f"Database error: {str(db_error)}"
                health_data["status"] = "error"
        except Exception as connection_error:
            health_data["database"]["status"] = "error"
            health_data["database"][
                "details"
            ] = f"Connection error: {str(connection_error)}"
            health_data["status"] = "error"

        return health_data
