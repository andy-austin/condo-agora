import strawberry

from ..graphql_types.onboarding import BulkSetupInput, BulkSetupResult
from ..resolvers.onboarding import resolve_bulk_setup_organization


@strawberry.type
class OnboardingMutations:
    bulk_setup_organization: BulkSetupResult = strawberry.mutation(
        resolver=resolve_bulk_setup_organization
    )
