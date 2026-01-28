import os
import ssl

import certifi
import jwt
from dotenv import load_dotenv
from fastapi import HTTPException
from jwt import PyJWKClient

# Load environment variables from the api directory
api_env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env",
)
load_dotenv(api_env_path)

CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL")
JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json" if CLERK_ISSUER_URL else None

# Initialize JWK Client for token verification with proper SSL context
ssl_context = ssl.create_default_context(cafile=certifi.where())
jwks_client = PyJWKClient(JWKS_URL, ssl_context=ssl_context) if JWKS_URL else None


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
