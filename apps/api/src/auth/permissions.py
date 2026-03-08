from bson import ObjectId

from ...database import db


async def get_user_role_in_org(user_id: str, organization_id: str) -> str | None:
    """
    Get the user's role in a specific organization.
    Returns the role string ('ADMIN', 'RESIDENT', 'MEMBER') or None if not a member.
    """
    if not db.is_connected():
        await db.connect()

    member = await db.db.organization_members.find_one(
        {"user_id": user_id, "organization_id": organization_id}
    )
    if not member:
        return None
    return member.get("role")


async def require_org_admin(user: dict, organization_id: str) -> None:
    """
    Verify that the user is an ADMIN in the given organization.
    Raises Exception if not authenticated, not a member, or not an admin.
    """
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    role = await get_user_role_in_org(user_id, organization_id)

    if role is None:
        raise Exception("You are not a member of this organization")
    if role != "ADMIN":
        raise Exception("Only administrators can perform this action")


async def require_org_member(user: dict, organization_id: str) -> str:
    """
    Verify that the user is a member of the given organization.
    Returns the user's role. Raises Exception if not a member.
    """
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))
    role = await get_user_role_in_org(user_id, organization_id)

    if role is None:
        raise Exception("You are not a member of this organization")
    return role


async def get_org_id_for_house(house_id: str) -> str | None:
    """
    Look up the organization_id for a given house.
    Returns None if the house doesn't exist.
    """
    if not db.is_connected():
        await db.connect()

    try:
        house = await db.db.houses.find_one({"_id": ObjectId(house_id)})
    except Exception:
        return None

    if not house:
        return None
    return house.get("organization_id")
