import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from apps.api.src.auth.dependencies import get_current_user, get_current_user_optional
from apps.api.tests.conftest import mock_users_collection


@pytest.mark.asyncio
async def test_get_current_user_returns_user():
    """Valid token + existing user returns a user dict with id field."""
    user_id = ObjectId()
    mock_user = {
        "_id": user_id,
        "nextauth_id": "uuid-1",
        "email": "user@example.com",
        "first_name": "Test",
        "last_name": "User",
    }
    mock_users_collection.find_one = AsyncMock(return_value=mock_user)

    credential = MagicMock()
    credential.credentials = "fake-jwt-token"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        return_value={"sub": "uuid-1", "email": "user@example.com"},
    ):
        user = await get_current_user(credential=credential)

    assert user["nextauth_id"] == "uuid-1"
    assert user["id"] == str(user_id)


@pytest.mark.asyncio
async def test_get_current_user_invalid_token_raises():
    """Invalid token raises 401."""
    credential = MagicMock()
    credential.credentials = "bad-token"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        side_effect=Exception("Invalid token"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credential=credential)

    assert exc_info.value.status_code == 401
    assert "Invalid or expired token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_user_missing_sub_raises():
    """Token with no sub claim raises 401."""
    credential = MagicMock()
    credential.credentials = "token-without-sub"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        return_value={"email": "user@example.com"},
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credential=credential)

    assert exc_info.value.status_code == 401
    assert "missing subject" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_user_not_found_raises():
    """Valid token but user not in DB raises 401."""
    mock_users_collection.find_one = AsyncMock(return_value=None)

    credential = MagicMock()
    credential.credentials = "valid-token"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        return_value={"sub": "uuid-unknown"},
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credential=credential)

    assert exc_info.value.status_code == 401
    assert "User not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_get_current_user_optional_no_token():
    """No credential returns None without raising."""
    user = await get_current_user_optional(credential=None)
    assert user is None


@pytest.mark.asyncio
async def test_get_current_user_optional_valid_token():
    """Valid token returns user dict."""
    user_id = ObjectId()
    mock_user = {
        "_id": user_id,
        "nextauth_id": "uuid-2",
        "email": "other@example.com",
        "first_name": "Other",
        "last_name": "User",
    }
    mock_users_collection.find_one = AsyncMock(return_value=mock_user)

    credential = MagicMock()
    credential.credentials = "valid-jwt"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        return_value={"sub": "uuid-2"},
    ):
        user = await get_current_user_optional(credential=credential)

    assert user is not None
    assert user["nextauth_id"] == "uuid-2"
    assert user["id"] == str(user_id)


@pytest.mark.asyncio
async def test_get_current_user_optional_invalid_token_returns_none():
    """Invalid token in optional variant returns None instead of raising."""
    credential = MagicMock()
    credential.credentials = "bad-token"

    with patch(
        "apps.api.src.auth.dependencies.verify_token",
        new_callable=AsyncMock,
        side_effect=Exception("Invalid"),
    ):
        user = await get_current_user_optional(credential=credential)

    assert user is None
