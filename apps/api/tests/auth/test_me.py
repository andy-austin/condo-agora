from unittest.mock import AsyncMock, MagicMock

import pytest

from apps.api.graphql_types.auth import Role
from apps.api.resolvers.auth import resolve_me


@pytest.mark.asyncio
async def test_resolve_me_authenticated(db_mock):
    # Setup
    user_id = "user-123"
    clerk_id = "clerk-123"

    mock_user_data = MagicMock()
    mock_user_data.id = user_id
    mock_user_data.clerkId = clerk_id
    mock_user_data.email = "test@example.com"
    mock_user_data.firstName = "Test"
    mock_user_data.lastName = "User"
    mock_user_data.avatarUrl = None
    mock_user_data.createdAt = "2023-01-01"
    mock_user_data.updatedAt = "2023-01-01"

    # Mock memberships
    mock_org = MagicMock()
    mock_org.id = "org-1"
    mock_org.name = "Test Org"
    mock_org.slug = "test-org"
    mock_org.createdAt = "2023-01-01"
    mock_org.updatedAt = "2023-01-01"

    mock_membership = MagicMock()
    mock_membership.id = "mem-1"
    mock_membership.userId = user_id
    mock_membership.organizationId = "org-1"
    mock_membership.role = "ADMIN"
    mock_membership.createdAt = "2023-01-01"
    mock_membership.organization = mock_org

    mock_user_data.memberships = [mock_membership]

    # Configure DB mock to handle user
    db_mock.user = MagicMock()
    db_mock.user.find_unique = AsyncMock(return_value=mock_user_data)

    # Mock Info context
    mock_info = MagicMock()
    mock_info.context = {"user": MagicMock(id=user_id)}

    # Execute
    result = await resolve_me(mock_info)

    # Verify
    assert result is not None
    assert result.id == user_id
    assert result.email == "test@example.com"
    assert len(result.memberships) == 1
    assert result.memberships[0].organization.id == "org-1"
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
