import os

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

# Load env vars from API directory
api_env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env",
)
load_dotenv(api_env_path)

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")


async def create_clerk_invitation(
    email: str, redirect_url: str = None, public_metadata: dict = None
):
    """
    Creates an invitation in Clerk.
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not found. Skipping Clerk invitation.")
        return None

    url = "https://api.clerk.com/v1/invitations"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    payload = {"email_address": email, "public_metadata": public_metadata or {}}

    if redirect_url:
        payload["redirect_url"] = redirect_url

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Clerk API Error: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to create Clerk invitation: {e.response.text}",
            )
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            raise HTTPException(status_code=500, detail=str(e))
