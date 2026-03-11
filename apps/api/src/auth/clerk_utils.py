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

    print(f"Clerk invitation request: email={email}, redirect_url={redirect_url}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            print(f"Clerk invitation response: status={response.status_code}")
            response.raise_for_status()
            result = response.json()
            print(
                f"Clerk invitation created: id={result.get('id')}, status={result.get('status')}"
            )
            return result
        except httpx.HTTPStatusError as e:
            print(
                f"Clerk API Error: status={e.response.status_code}, body={e.response.text}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to create Clerk invitation: {e.response.text}",
            )
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            raise HTTPException(status_code=500, detail=str(e))


async def revoke_clerk_invitations_for_email(email: str):
    """
    Revoke all existing Clerk invitations for an email address.
    This is needed before creating a new invitation, since Clerk
    rejects duplicates even for revoked/accepted invitations.
    """
    if not CLERK_SECRET_KEY:
        return

    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # List all invitations
        try:
            response = await client.get(
                "https://api.clerk.com/v1/invitations",
                headers=headers,
            )
            response.raise_for_status()
            invitations = response.json()
        except Exception as e:
            print(f"Failed to list Clerk invitations: {e}")
            return

        # Revoke any pending invitations for this email
        for inv in (
            invitations.get("data", invitations)
            if isinstance(invitations, dict)
            else invitations
        ):
            if inv.get("email_address") == email and inv.get("status") == "pending":
                inv_id = inv["id"]
                try:
                    revoke_resp = await client.post(
                        f"https://api.clerk.com/v1/invitations/{inv_id}/revoke",
                        headers=headers,
                    )
                    revoke_resp.raise_for_status()
                    print(f"Revoked Clerk invitation {inv_id} for {email}")
                except Exception as e:
                    print(f"Failed to revoke Clerk invitation {inv_id}: {e}")


async def create_phone_user(
    phone: str,
    first_name: str = None,
    last_name: str = None,
    metadata: dict = None,
):
    """
    Creates a Clerk user with phone number as primary identifier.
    Phone must be in E.164 format (e.g., +584121234567).
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not found. Skipping Clerk user creation.")
        return None

    url = "https://api.clerk.com/v1/users"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    unsafe_metadata = metadata or {}
    unsafe_metadata["requires_profile_completion"] = True

    payload = {
        "phone_number": [phone],
        "unsafe_metadata": unsafe_metadata,
    }
    if first_name:
        payload["first_name"] = first_name
    if last_name:
        payload["last_name"] = last_name

    print(f"Clerk create_phone_user request: phone={phone}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            print(f"Clerk create_phone_user response: status={response.status_code}")
            response.raise_for_status()
            result = response.json()
            print(f"Clerk user created: id={result.get('id')}")
            return result
        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            print(
                f"Clerk API Error creating phone user: "
                f"status={e.response.status_code}, body={error_body}"
            )
            return {
                "error": True,
                "status": e.response.status_code,
                "detail": error_body,
            }
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            return {"error": True, "status": 500, "detail": str(e)}


async def delete_clerk_user(clerk_id: str):
    """
    Deletes a user from Clerk by their Clerk user ID.
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not found. Skipping Clerk user deletion.")
        return None

    url = f"https://api.clerk.com/v1/users/{clerk_id}"
    headers = {
        "Authorization": f"Bearer {CLERK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.delete(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Clerk API Error deleting user: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to delete Clerk user: {e.response.text}",
            )
        except Exception as e:
            print(f"Error calling Clerk API: {e}")
            raise HTTPException(status_code=500, detail=str(e))
