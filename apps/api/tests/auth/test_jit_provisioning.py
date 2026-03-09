from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.security import HTTPAuthorizationCredentials

from apps.api.src.auth.dependencies import (
    _provision_user_from_clerk,
    get_current_user_optional,
)
from apps.api.tests.conftest import mock_users_collection


MOCK_CLERK_USER_RESPONSE = {
    "id": "user_new123",
    "email_addresses": [
        {
            "id": "idn_abc",
            "email_address": "newuser@example.com",
        }
    ],
    "primary_email_address_id": "idn_abc",
    "first_name": "New",
    "last_name": "User",
    "image_url": "https://img.clerk.com/avatar.png",
}


@pytest.mark.asyncio
@patch("apps.api.src.auth.dependencies.verify_clerk_token")
@patch("apps.api.src.auth.dependencies._provision_user_from_clerk")
async def test_get_current_user_optional_provisions_when_no_db_record(
    mock_provision, mock_verify
):
    """
    A user with a valid JWT but no MongoDB record should be provisioned
    via Clerk API (JIT), not silently rejected as unauthenticated.
    """
    user_id = ObjectId()
    mock_verify.return_value = {"sub": "user_new123"}

    # First call: no user in DB. Second call after provisioning: user exists.
    mock_users_collection.find_one.return_value = None

    provisioned_user = {
        "_id": user_id,
        "clerk_id": "user_new123",
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "avatar_url": "https://img.clerk.com/avatar.png",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    mock_provision.return_value = provisioned_user

    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake-jwt-token")
    result = await get_current_user_optional(auth)

    assert result is not None
    assert result["clerk_id"] == "user_new123"
    assert result["email"] == "newuser@example.com"
    assert result["id"] == str(user_id)
    mock_provision.assert_called_once_with("user_new123")


@pytest.mark.asyncio
@patch("apps.api.src.auth.dependencies.verify_clerk_token")
async def test_get_current_user_optional_skips_provisioning_for_existing_user(
    mock_verify,
):
    """Existing users should not trigger JIT provisioning."""
    user_id = ObjectId()
    mock_verify.return_value = {"sub": "user_existing"}

    existing_user = {
        "_id": user_id,
        "clerk_id": "user_existing",
        "email": "existing@example.com",
        "first_name": "Existing",
        "last_name": "User",
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    mock_users_collection.find_one.return_value = existing_user

    auth = HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake-jwt-token")

    with patch(
        "apps.api.src.auth.dependencies._provision_user_from_clerk"
    ) as mock_provision:
        result = await get_current_user_optional(auth)
        mock_provision.assert_not_called()

    assert result is not None
    assert result["clerk_id"] == "user_existing"


@pytest.mark.asyncio
@patch("apps.api.src.auth.dependencies.CLERK_SECRET_KEY", None)
async def test_provision_user_returns_none_without_secret_key():
    """JIT provisioning should gracefully return None if CLERK_SECRET_KEY is missing."""
    result = await _provision_user_from_clerk("user_xyz")
    assert result is None


@pytest.mark.asyncio
@patch("apps.api.src.auth.dependencies.CLERK_SECRET_KEY", "sk_test_fake")
@patch("apps.api.src.auth.dependencies.httpx.AsyncClient")
async def test_provision_user_creates_db_record(mock_client_class):
    """JIT provisioning should fetch from Clerk API and insert into MongoDB."""
    user_id = ObjectId()

    # Mock httpx response
    mock_response = MagicMock()
    mock_response.json.return_value = MOCK_CLERK_USER_RESPONSE
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_response
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_class.return_value = mock_client

    # Mock DB insert + find
    mock_users_collection.insert_one.return_value = MagicMock(inserted_id=user_id)
    mock_users_collection.find_one.return_value = {
        "_id": user_id,
        "clerk_id": "user_new123",
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "avatar_url": "https://img.clerk.com/avatar.png",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await _provision_user_from_clerk("user_new123")

    assert result is not None
    assert result["clerk_id"] == "user_new123"
    assert result["email"] == "newuser@example.com"
    mock_client.get.assert_called_once()
    mock_users_collection.insert_one.assert_called_once()


@pytest.mark.asyncio
@patch("apps.api.src.auth.dependencies.CLERK_SECRET_KEY", "sk_test_fake")
@patch("apps.api.src.auth.dependencies.httpx.AsyncClient")
async def test_provision_user_returns_none_on_clerk_api_failure(mock_client_class):
    """JIT provisioning should return None if Clerk API call fails."""
    mock_client = AsyncMock()
    mock_client.get.side_effect = Exception("Connection refused")
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client_class.return_value = mock_client

    result = await _provision_user_from_clerk("user_fail")
    assert result is None
