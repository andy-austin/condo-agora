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


class TestCreateInvitation:
    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.send_email_invitation", new_callable=AsyncMock)
    async def test_creates_invitation_successfully(self, mock_send_email):
        inv_id = ObjectId()
        org_id = ObjectId()
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=inv_id
        )
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }

        result = await create_invitation(
            "user@example.com", str(org_id), "inviter-1", "MEMBER"
        )

        assert result["identifier"] == "user@example.com"
        assert result["role"] == "MEMBER"
        assert result["channel"] == "email"
        mock_invitations_collection.insert_one.assert_called_once()
        mock_send_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_rejects_invalid_email(self):
        with pytest.raises(Exception, match="Invalid email address format"):
            await create_invitation(
                "not-an-email", str(ObjectId()), "inviter-1", "MEMBER"
            )

    @pytest.mark.asyncio
    async def test_rejects_invalid_phone_for_whatsapp(self):
        with pytest.raises(Exception, match="Invalid phone number format"):
            await create_invitation(
                "not-a-phone",
                str(ObjectId()),
                "inviter-1",
                "MEMBER",
                channel="whatsapp",
            )

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.send_whatsapp_invitation", new_callable=AsyncMock)
    async def test_creates_whatsapp_invitation(self, mock_send_whatsapp):
        inv_id = ObjectId()
        org_id = ObjectId()
        mock_invitations_collection.find_one.return_value = None
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=inv_id
        )
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }

        result = await create_invitation(
            "+12125551234", str(org_id), "inviter-1", "MEMBER", channel="whatsapp"
        )

        assert result["identifier"] == "+12125551234"
        assert result["channel"] == "whatsapp"
        mock_send_whatsapp.assert_called_once()

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.send_email_invitation", new_callable=AsyncMock)
    async def test_resends_duplicate_pending_invitation(self, mock_send_email):
        org_id = ObjectId()
        existing = {
            "_id": ObjectId(),
            "identifier": "user@example.com",
            "organization_id": str(org_id),
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
        }
        mock_invitations_collection.find_one.return_value = existing
        mock_invitations_collection.insert_one.return_value = MagicMock(
            inserted_id=ObjectId()
        )
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }

        result = await create_invitation(
            "user@example.com", str(org_id), "inviter-1", "MEMBER"
        )

        assert result["identifier"] == "user@example.com"
        mock_invitations_collection.delete_one.assert_called_once()
        mock_send_email.assert_called_once()

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.send_email_invitation", new_callable=AsyncMock)
    async def test_notifies_existing_user_when_send_fails(self, mock_send_email):
        mock_send_email.side_effect = Exception("Send failed")
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

        assert result["identifier"] == "existing@example.com"
        # Notification should have been created
        mock_notifications_collection.insert_one.assert_called_once()


class TestAcceptInvitationById:
    @pytest.mark.asyncio
    async def test_accepts_invitation_successfully(self):
        inv_id = ObjectId()
        user_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "identifier": "user@example.com",
            "organization_id": "org-1",
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
            "channel": "email",
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
    async def test_accepts_legacy_email_field(self):
        """Invitations with old 'email' field (before migration) should still work."""
        inv_id = ObjectId()
        user_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "email": "user@example.com",  # old field
            "organization_id": "org-1",
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
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
    async def test_raises_when_identifier_mismatch(self):
        inv_id = ObjectId()
        user_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "identifier": "user@example.com",
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
    async def test_revokes_pending_invitation(self):
        inv_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "identifier": "user@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
        }
        mock_invitations_collection.find_one.return_value = invitation

        org_id = await revoke_invitation(str(inv_id))

        assert org_id == "org-1"
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
    @patch("apps.api.src.auth.service.send_email_invitation", new_callable=AsyncMock)
    async def test_resends_invitation(self, mock_send_email):
        inv_id = ObjectId()
        org_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "identifier": "user@example.com",
            "channel": "email",
            "organization_id": str(org_id),
            "role": "MEMBER",
            "token": "tok-123",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
        }
        mock_invitations_collection.find_one.return_value = invitation
        mock_invitations_collection.find_one_and_update.return_value = invitation
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }

        result = await resend_invitation(str(inv_id))

        assert result is not None
        mock_send_email.assert_called_once()
        call_kwargs = mock_send_email.call_args
        assert call_kwargs.kwargs.get("org_name") == "Test Org"

    @pytest.mark.asyncio
    @patch("apps.api.src.auth.service.send_whatsapp_invitation", new_callable=AsyncMock)
    async def test_resends_whatsapp_invitation(self, mock_send_whatsapp):
        inv_id = ObjectId()
        org_id = ObjectId()
        invitation = {
            "_id": inv_id,
            "identifier": "+12125551234",
            "channel": "whatsapp",
            "organization_id": str(org_id),
            "role": "MEMBER",
            "token": "tok-456",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
            "inviter_id": "inviter-1",
        }
        mock_invitations_collection.find_one.return_value = invitation
        mock_invitations_collection.find_one_and_update.return_value = invitation
        mock_organizations_collection.find_one.return_value = {
            "_id": org_id,
            "name": "Test Org",
        }

        result = await resend_invitation(str(inv_id))

        assert result is not None
        mock_send_whatsapp.assert_called_once()

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
            "identifier": "a@example.com",
            "organization_id": "org-1",
            "accepted_at": None,
            "expires_at": datetime.utcnow() + timedelta(days=3),
            "created_at": datetime.utcnow(),
        }
        inv2 = {
            "_id": ObjectId(),
            "identifier": "b@example.com",
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
