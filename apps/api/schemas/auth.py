from typing import Optional

import strawberry

from ..graphql_types.auth import Invitation, User
from ..resolvers.auth import resolve_create_invitation, resolve_me


@strawberry.type
class AuthQueries:
    me: Optional[User] = strawberry.field(resolver=resolve_me)


@strawberry.type
class AuthMutations:
    create_invitation: Invitation = strawberry.mutation(
        resolver=resolve_create_invitation
    )
