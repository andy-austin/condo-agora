from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from apps.api.graphql_types.auth import Role
from apps.api.resolvers.auth import resolve_me

from ..conftest import (
    create_async_cursor_mock,
    mock_organization_members_collection,
    mock_organizations_collection,
    mock_users_collection,
)


@pytest.mark.asyncio
async def test_resolve_me_authenticated():
    # Setup
    user_id = ObjectId()
    org_id = ObjectId()
    member_id = ObjectId()

    mock_user_doc = {
        "_id": user_id,
        "clerk_id": "clerk-123",
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    mock_org_doc = {
        "_id": org_id,
        "name": "Test Org",
        "slug": "test-org",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    mock_membership_doc = {
        "_id": member_id,
        "user_id": str(user_id),
        "organization_id": str(org_id),
        "house_id": None,
        "role": "ADMIN",
        "created_at": datetime.now(timezone.utc),
    }

    # Configure mocks
    mock_users_collection.find_one.return_value = mock_user_doc
    mock_organization_members_collection.find.return_value = create_async_cursor_mock(
        [mock_membership_doc]
    )
    mock_organizations_collection.find_one.return_value = mock_org_doc

    # Mock Info context
    mock_info = MagicMock()
    mock_info.context = {"user": {"id": str(user_id), "_id": user_id}}

    # Execute
    result = await resolve_me(mock_info)

    # Verify
    assert result is not None
    assert result.id == str(user_id)
    assert result.email == "test@example.com"
    assert len(result.memberships) == 1
    assert result.memberships[0].organization.id == str(org_id)
    assert result.memberships[0].role == Role.ADMIN


@pytest.mark.asyncio
async def test_resolve_me_unauthenticated():
    # Mock Info context with no user
    mock_info = MagicMock()
    mock_info.context = {}

    # Execute
    result = await resolve_me(mock_info)

    # Verify
    assert result is None
