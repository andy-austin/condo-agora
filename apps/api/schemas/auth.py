import strawberry
from ..resolvers.auth import resolve_create_invitation
from ..graphql_types.auth import Invitation


@strawberry.type
class AuthMutations:
    create_invitation: Invitation = strawberry.mutation(
        resolver=resolve_create_invitation
    )
