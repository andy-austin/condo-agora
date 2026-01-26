import strawberry

from ..graphql_types.auth import Invitation
from ..resolvers.auth import resolve_create_invitation


@strawberry.type
class AuthMutations:
    create_invitation: Invitation = strawberry.mutation(
        resolver=resolve_create_invitation
    )
