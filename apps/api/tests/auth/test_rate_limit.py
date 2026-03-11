import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from apps.api.src.auth.rate_limit import check_rate_limit, RateLimitExceeded


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.rate_limits = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_check_rate_limit_allows_first_request(mock_db):
    mock_db.rate_limits.find_one_and_update = AsyncMock(
        return_value={
            "key": "otp_request:127.0.0.1",
            "count": 1,
            "window_start": datetime.now(timezone.utc),
        }
    )
    # Should not raise
    await check_rate_limit(
        mock_db, key="otp_request:127.0.0.1", max_count=10, window_seconds=3600
    )


@pytest.mark.asyncio
async def test_check_rate_limit_blocks_when_exceeded(mock_db):
    mock_db.rate_limits.find_one_and_update = AsyncMock(
        return_value={
            "key": "otp_request:127.0.0.1",
            "count": 11,
            "window_start": datetime.now(timezone.utc),
        }
    )
    with pytest.raises(RateLimitExceeded):
        await check_rate_limit(
            mock_db, key="otp_request:127.0.0.1", max_count=10, window_seconds=3600
        )
