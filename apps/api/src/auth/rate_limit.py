from datetime import datetime, timedelta, timezone


class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded."""

    def __init__(self, key: str, max_count: int, window_seconds: int):
        self.key = key
        self.max_count = max_count
        self.window_seconds = window_seconds
        super().__init__(
            f"Rate limit exceeded for {key}: {max_count} requests per {window_seconds}s"
        )


async def check_rate_limit(db, key: str, max_count: int, window_seconds: int) -> None:
    """Increment counter for key. Raise RateLimitExceeded if over max_count.

    Uses MongoDB upsert with TTL. Each key gets a counter doc that auto-expires.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=window_seconds)

    # Atomically increment counter, create if not exists
    result = await db.rate_limits.find_one_and_update(
        {"key": key, "window_start": {"$gte": window_start}},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"key": key, "window_start": now},
        },
        upsert=True,
        return_document=True,
    )

    if result and result.get("count", 0) > max_count:
        raise RateLimitExceeded(key, max_count, window_seconds)
