import pytest
import jwt
from datetime import datetime, timezone, timedelta

from apps.api.src.auth.utils import verify_token


def _make_token(
    payload: dict, secret: str = "test-nextauth-secret-min-32-chars!!"
) -> str:
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_verify_token_valid():
    token = _make_token(
        {
            "sub": "uuid-1",
            "email": "user@example.com",
            "iat": datetime.now(timezone.utc).timestamp(),
            "exp": (datetime.now(timezone.utc) + timedelta(days=30)).timestamp(),
        }
    )
    payload = await verify_token(token, secret="test-nextauth-secret-min-32-chars!!")
    assert payload["sub"] == "uuid-1"


@pytest.mark.asyncio
async def test_verify_token_expired():
    token = _make_token(
        {
            "sub": "uuid-1",
            "iat": (datetime.now(timezone.utc) - timedelta(days=60)).timestamp(),
            "exp": (datetime.now(timezone.utc) - timedelta(days=1)).timestamp(),
        }
    )
    with pytest.raises(Exception):
        await verify_token(token, secret="test-nextauth-secret-min-32-chars!!")


@pytest.mark.asyncio
async def test_verify_token_wrong_secret():
    token = _make_token(
        {"sub": "uuid-1"}, secret="correct-secret-that-is-long-enough!!"
    )
    with pytest.raises(Exception):
        await verify_token(token, secret="wrong-secret-that-is-long-enough!!!")
