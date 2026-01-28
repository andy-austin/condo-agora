import strawberry

from .schemas.auth import AuthMutations, AuthQueries
from .schemas.health import HealthQueries
from .schemas.house import HouseMutations, HouseQueries
from .schemas.note import NoteMutations, NoteQueries


@strawberry.type
class Query(NoteQueries, HealthQueries, AuthQueries, HouseQueries):
    pass


@strawberry.type
class Mutation(NoteMutations, AuthMutations, HouseMutations):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
