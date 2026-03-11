from apps.api.models.user import User
from datetime import datetime


def test_user_without_email():
    """User can be created with phone_number and no email."""
    user = User(
        clerk_id="clerk_123",
        phone_number="+584121234567",
        first_name="María",
        last_name="García",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email is None
    assert user.phone_number == "+584121234567"
    assert user.requires_profile_completion is False


def test_user_with_email_still_works():
    """Existing users with email are not affected."""
    user = User(
        clerk_id="clerk_456",
        email="test@example.com",
        first_name="Carlos",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email == "test@example.com"
    assert user.phone_number is None


def test_user_requires_profile_completion_flag():
    """User can be created with requires_profile_completion=True."""
    user = User(
        clerk_id="clerk_789",
        phone_number="+584149876543",
        requires_profile_completion=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.requires_profile_completion is True
