import strawberry

from .schemas.auth import AuthMutations
from .schemas.health import HealthQueries
from .schemas.note import NoteMutations, NoteQueries


@strawberry.type
class Query(NoteQueries, HealthQueries):
    pass


@strawberry.type
class Mutation(NoteMutations, AuthMutations):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
