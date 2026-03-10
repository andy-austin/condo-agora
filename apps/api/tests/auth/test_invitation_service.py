from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from apps.api.src.auth.service import (
    accept_invitation_by_id,
    create_invitation,
    get_pending_invitations,
    resend_invitation,
    revoke_invitation,
)
from apps.api.tests.conftest import (
    create_async_cursor_mock,
    mock_invitations_collection,
    mock_notifications_collection,
    mock_organization_members_collection,
    mock_organizations_collection,
    mock_users_collection,
)

# Patch _get_or_create_clerk_org_id to return None (fallback to generic invitation)
# for tests that don't need org invitation behavior.
MOCK_NO_CLERK_ORG = patch(
    "apps.api.src.auth.service._get_or_create_clerk_org_id",
    new_callable=AsyncMock,
    return_value=None,
)


@MOCK_NO_CLERK_ORG
@patch(
    "apps.api.src.auth.service.revoke_clerk_invitations_for_email",
    new_callable=AsyncMock,
)
class TestCreateInvitation:
    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.create_clerk_invitation", new_callable=AsyncMock)
    async def test_creates_invitation_successfully(
        self, mock_clerk, _mock_revoke, _mock_clerk_org
    ):
        mock_clerk.return_value = {"id": "clerk_inv_1"}
        inv_id = ObjectId()
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=inv_id
        )

        result = await create_invitation(
            "user@example.com", "org-1", "inviter-1", "MEMBER"
        )

        assert result["email"] == "user@example.com"
        assert result["role"] == "MEMBER"
        assert result["method"] == "EMAIL"
        mock_invitations_collection.insert_one.assert_called_once()
        mock_clerk.assert_called_once()

    @pytest.mark.asyncio
    async def test_rejects_invalid_email(self, _mock_revoke, _mock_clerk_org):
        with pytest.raises(Exception, match="Invalid email address format"):
            await create_invitation("not-an-email", "org-1", "inviter-1", "MEMBER")

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.create_clerk_invitation", new_callable=AsyncMock)
    async def test_resends_duplicate_pending_invitation(
        self, mock_clerk, _mock_revoke, _mock_clerk_org
    ):
        mock_clerk.return_value = {"id": "clerk_inv_2"}
        existing = {
            "_id": ObjectId(),
            "email": "user@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
        }
        mock_invitations_collection.find_one.return_value = existing
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )

        result = await create_invitation(
            "user@example.com", "org-1", "inviter-1", "MEMBER"
        )

        assert result["email"] == "user@example.com"
        mock_invitations_collection.delete_one.assert_called_once()
        mock_clerk.assert_called_once()

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.create_clerk_invitation", new_callable=AsyncMock)
    async def test_replaces_expired_invitation(
        self, mock_clerk, _mock_revoke, _mock_clerk_org
    ):
        mock_clerk.return_value = {"id": "clerk_inv_1"}
        expired = {
            "_id": ObjectId(),
            "email": "user@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
            "expires_at": datetime.utcnow() - timedelta(days=1),
        }
        mock_invitations_collection.find_one.return_value = expired
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )

        result = await create_invitation(
            "user@example.com", "org-1", "inviter-1", "MEMBER"
        )

        assert result["email"] == "user@example.com"
        mock_invitations_collection.delete_one.assert_called_once()

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.create_clerk_invitation", new_callable=AsyncMock)
    async def test_notifies_existing_clerk_user(
        self, mock_clerk, _mock_revoke, _mock_clerk_org
    ):
        from fastapi import HTTPException

        mock_clerk.side_effect = HTTPException(
            status_code=422,
            detail="Failed to create Clerk invitation: form_identifier_exists",
        )
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )

        user_id = ObjectId()
        mock_users_collection.find_one.return_value = {
            "_id": user_id,
            "email": "existing@example.com",
        }
        org_id = ObjectId()
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }
        mock_notifications_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )
        mock_notifications_collection.find_one.return_value = {
            "_id": ObjectId(),
            "user_id": str(user_id),
            "type": "INVITATION",
        }

        result = await create_invitation(
            "existing@example.com", str(org_id), "inviter-1", "MEMBER"
        )

        assert result["email"] == "existing@example.com"
        # Notification should have been created
        mock_notifications_collection.insert_one.assert_called_once()


@MOCK_NO_CLERK_ORG
@patch(
    "apps.api.src.auth.service.revoke_clerk_org_invitations_for_email",
    new_callable=AsyncMock,
)
@patch(
    "apps.api.src.auth.service.create_clerk_org_invitation",
    new_callable=AsyncMock,
)
class TestCreateInvitationWithOrgInvitation:
    """Tests for invitation creation using Clerk Organization invitations."""

    @pytest.mark.asyncio
    async def test_uses_clerk_org_invitation_when_available(
        self, mock_org_inv, _mock_revoke_org, mock_clerk_org
    ):
        mock_clerk_org.return_value = "clerk_org_123"
        mock_org_inv.return_value = {"id": "org_inv_1"}
        inv_id = ObjectId()
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=inv_id
        )

        result = await create_invitation(
            "user@example.com", "org-1", "inviter-1", "MEMBER"
        )

        assert result["email"] == "user@example.com"
        mock_org_inv.assert_called_once()

    @pytest.mark.asyncio
    @patch(
        "apps.api.src.auth.service.revoke_clerk_invitations_for_email",
        new_callable=AsyncMock,
    )
    @patch(
        "apps.api.src.auth.service.create_clerk_invitation",
        new_callable=AsyncMock,
    )
    async def test_falls_back_to_generic_on_org_failure(
        self,
        mock_generic,
        _mock_revoke_generic,
        mock_org_inv,
        _mock_revoke_org,
        mock_clerk_org,
    ):
        mock_clerk_org.return_value = "clerk_org_123"
        mock_org_inv.side_effect = Exception("Clerk org API error")
        mock_generic.return_value = {"id": "generic_inv_1"}
        inv_id = ObjectId()
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=inv_id
        )

        result = await create_invitation(
            "user@example.com", "org-1", "inviter-1", "MEMBER"
        )

        assert result["email"] == "user@example.com"
        mock_generic.assert_called_once()


class TestAcceptInvitationById:
    @pytest.mark.asyncio
    async def test_accepts_invitation_successfully(self):
        inv_id = ObjectId()
        user_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",
            "organization_id": "org-1",
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
            "method": "EMAIL",
        }
        user = {
            "_id": user_id,
            "email": "user@example.com",
        }

        mock_invitations_collection.find_one.return_value = invitation
        mock_users_collection.find_one.return_value = user
        mock_organization_members_collection.find_one.return_value = None
        mock_invitations_collection.find_one_and_update.return_value = {
            **invitation,
            "accepted_at": datetime.utcnow(),
        }

        result = await accept_invitation_by_id(str(inv_id), str(user_id))

        assert result["accepted_at"] is not None
        mock_organization_members_collection.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_invitations_collection.find_one.return_value = None

        with pytest.raises(Exception, match="Invitation not found"):
            await accept_invitation_by_id(str(ObjectId()), str(ObjectId()))

    @pytest.mark.asyncio
    async def test_raises_when_already_accepted(self):
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "accepted_at": datetime.utcnow(),
        }
        mock_invitations_collection.find_one.return_value = invitation

        with pytest.raises(Exception, match="already accepted"):
            await accept_invitation_by_id(str(inv_id), str(ObjectId()))

    @pytest.mark.asyncio
    async def test_raises_when_expired(self):
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "accepted_at": None,
            "expires_at": datetime.utcnow() - timedelta(days=1),
        }
        mock_invitations_collection.find_one.return_value = invitation

        with pytest.raises(Exception, match="expired"):
            await accept_invitation_by_id(str(inv_id), str(ObjectId()))

    @pytest.mark.asyncio
    async def test_raises_when_email_mismatch(self):
        inv_id = ObjectId()
        user_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
        }
        user = {
            "_id": user_id,
            "email": "other@example.com",
        }

        mock_invitations_collection.find_one.return_value = invitation
        mock_users_collection.find_one.return_value = user

        with pytest.raises(Exception, match="not for your account"):
            await accept_invitation_by_id(str(inv_id), str(user_id))


class TestRevokeInvitation:
    @pytest.mark.asyncio
    @patch(
        "apps.api.src.auth.service._get_or_create_clerk_org_id",
        new_callable=AsyncMock,
        return_value=None,
    )
    @patch(
        "apps.api.src.auth.service.revoke_clerk_invitations_for_email",
        new_callable=AsyncMock,
    )
    async def test_revokes_pending_invitation(self, mock_revoke_clerk, _mock_clerk_org):
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
        }
        mock_invitations_collection.find_one.return_value = invitation

        org_id = await revoke_invitation(str(inv_id))

        assert org_id == "org-1"
        mock_revoke_clerk.assert_called_once_with("user@example.com")
        mock_invitations_collection.delete_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_invitations_collection.find_one.return_value = None

        with pytest.raises(Exception, match="Invitation not found"):
            await revoke_invitation(str(ObjectId()))

    @pytest.mark.asyncio
    async def test_raises_when_already_accepted(self):
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "organization_id": "org-1",
            "accepted_at": datetime.utcnow(),
        }
        mock_invitations_collection.find_one.return_value = invitation

        with pytest.raises(Exception, match="Cannot revoke"):
            await revoke_invitation(str(inv_id))


class TestResendInvitation:
    @pytest.mark.asyncio
    @patch(
        "apps.api.src.auth.service._get_or_create_clerk_org_id",
        new_callable=AsyncMock,
        return_value=None,
    )
    @patch(
        "apps.api.src.auth.service.revoke_clerk_invitations_for_email",
        new_callable=AsyncMock,
    )
    @patch(
        "apps.api.src.auth.service.create_clerk_invitation",
        new_callable=AsyncMock,
    )
    async def test_resends_invitation(self, mock_clerk, _mock_revoke, _mock_clerk_org):
        mock_clerk.return_value = {"id": "clerk_inv_1"}
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",
            "organization_id": "org-1",
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "method": "EMAIL",
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
        }
        mock_invitations_collection.find_one.return_value = invitation
        mock_invitations_collection.find_one_and_update.return_value = invitation

        result = await resend_invitation(str(inv_id))

        assert result is not None
        mock_clerk.assert_called_once()

    @pytest.mark.asyncio
    @patch(
        "apps.api.src.auth.service._get_or_create_clerk_org_id",
        new_callable=AsyncMock,
        return_value="clerk_org_123",
    )
    @patch(
        "apps.api.src.auth.service.revoke_clerk_org_invitations_for_email",
        new_callable=AsyncMock,
    )
    @patch(
        "apps.api.src.auth.service.create_clerk_org_invitation",
        new_callable=AsyncMock,
    )
    async def test_resends_via_org_invitation(
        self, mock_org_inv, _mock_revoke_org, _mock_clerk_org
    ):
        mock_org_inv.return_value = {"id": "org_inv_1"}
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",
            "organization_id": "org-1",
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "method": "EMAIL",
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
        }
        mock_invitations_collection.find_one.return_value = invitation
        mock_invitations_collection.find_one_and_update.return_value = invitation

        result = await resend_invitation(str(inv_id))

        assert result is not None
        mock_org_inv.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self):
        mock_invitations_collection.find_one.return_value = None

        with pytest.raises(Exception, match="Invitation not found"):
            await resend_invitation(str(ObjectId()))


class TestGetPendingInvitations:
    @pytest.mark.asyncio
    async def test_returns_pending_invitations(self):
        inv1 = {
            "_id": ObjectId(),
            "email": "a@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
        }
        inv2 = {
            "_id": ObjectId(),
            "email": "b@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=5),
            "created_at": datetime.utcnow(),
        }

        cursor_mock = create_async_cursor_mock([inv1, inv2])
        cursor_mock.sort = MagicMock(
            return_value=create_async_cursor_mock([inv1, inv2])
        )
        mock_invitations_collection.find.return_value = cursor_mock

        result = await get_pending_invitations("org-1")

        assert len(result) == 2
