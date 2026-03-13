from datetime import datetime, timedelta, timezone

from apps.api.models.invitation import Invitation, InvitationMethod


def test_whatsapp_invitation_method_exists():
    assert InvitationMethod.WHATSAPP == "WHATSAPP"


def test_invitation_with_phone_only():
    inv = Invitation(
        phone="+584121234567",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.WHATSAPP,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.phone == "+584121234567"
    assert inv.email is None
    assert inv.method == InvitationMethod.WHATSAPP


def test_invitation_with_email_only():
    inv = Invitation(
        email="test@example.com",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.email == "test@example.com"
    assert inv.phone is None


def test_invitation_with_both_phone_and_email():
    inv = Invitation(
        email="test@example.com",
        phone="+584121234567",
        token="test-token",
        organization_id="org-1",
        inviter_id="user-1",
        method=InvitationMethod.EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    assert inv.email == "test@example.com"
    assert inv.phone == "+584121234567"
