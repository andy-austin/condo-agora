from datetime import datetime

from apps.api.models.user import User


def test_user_with_phone():
    """User can be created with phone number."""
    user = User(
        nextauth_id="na_123",
        email="maria@example.com",
        phone="+584121234567",
        first_name="María",
        last_name="García",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email == "maria@example.com"
    assert user.phone == "+584121234567"
    assert user.auth_provider == "phone"


def test_user_with_email_only():
    """User can be created with email and no phone."""
    user = User(
        nextauth_id="na_456",
        email="test@example.com",
        first_name="Carlos",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.email == "test@example.com"
    assert user.phone is None


def test_user_auth_provider_defaults_to_phone():
    """auth_provider defaults to 'phone'."""
    user = User(
        nextauth_id="na_789",
        email="user@example.com",
        phone="+584149876543",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.auth_provider == "phone"


def test_user_google_auth_provider():
    """User can have google auth provider."""
    user = User(
        nextauth_id="na_google_1",
        email="user@gmail.com",
        auth_provider="google",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    assert user.auth_provider == "google"
