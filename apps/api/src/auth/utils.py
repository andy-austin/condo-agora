import os
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException

CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL")
JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json" if CLERK_ISSUER_URL else None

# Initialize JWK Client for token verification
jwks_client = PyJWKClient(JWKS_URL) if JWKS_URL else None


async def verify_clerk_token(token: str):
    """
    Verifies the Clerk JWT token using RS256 and JWKS.
    """
    if not CLERK_ISSUER_URL:
        raise HTTPException(
            status_code=500, detail="CLERK_ISSUER_URL is not configured"
        )

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token, signing_key.key, algorithms=["RS256"], issuer=CLERK_ISSUER_URL
        )
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
