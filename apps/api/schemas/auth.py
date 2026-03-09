from typing import List, Optional

import strawberry

from ..graphql_types.auth import Invitation, MemberWithUser, Organization, User
from ..resolvers.auth import (
    resolve_create_invitation,
    resolve_create_organization,
    resolve_me,
    resolve_organization_members,
    resolve_update_member_role,
)


@strawberry.type
class AuthQueries:
    me: Optional[User] = strawberry.field(resolver=resolve_me)
    organization_members: List[MemberWithUser] = strawberry.field(
        resolver=resolve_organization_members
    )


@strawberry.type
class AuthMutations:
    create_invitation: Invitation = strawberry.mutation(
        resolver=resolve_create_invitation
    )
    update_member_role: MemberWithUser = strawberry.mutation(
        resolver=resolve_update_member_role
    )
    create_organization: Organization = strawberry.mutation(
        resolver=resolve_create_organization
    )
