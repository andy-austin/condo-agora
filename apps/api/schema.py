import strawberry

from .schemas.health import HealthQueries
from .schemas.note import NoteMutations, NoteQueries
from .schemas.auth import AuthMutations


@strawberry.type
class Query(NoteQueries, HealthQueries):
    pass


@strawberry.type
class Mutation(NoteMutations, AuthMutations):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
