from typing import List, Optional

import strawberry

from ..graphql_types.auth import OrganizationMember
from ..graphql_types.house import House
from ..resolvers.house import (
    resolve_assign_resident_to_house,
    resolve_create_house,
    resolve_delete_house,
    resolve_house,
    resolve_houses,
    resolve_remove_resident_from_house,
    resolve_update_house,
)


@strawberry.type
class HouseQueries:
    houses: List[House] = strawberry.field(resolver=resolve_houses)
    house: Optional[House] = strawberry.field(resolver=resolve_house)


@strawberry.type
class HouseMutations:
    create_house: House = strawberry.mutation(resolver=resolve_create_house)
    update_house: House = strawberry.mutation(resolver=resolve_update_house)
    delete_house: bool = strawberry.mutation(resolver=resolve_delete_house)
    assign_resident_to_house: OrganizationMember = strawberry.mutation(
        resolver=resolve_assign_resident_to_house
    )
    remove_resident_from_house: OrganizationMember = strawberry.mutation(
        resolver=resolve_remove_resident_from_house
    )
