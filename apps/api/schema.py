import strawberry

from .schemas.auth import AuthMutations, AuthQueries
from .schemas.health import HealthQueries
from .schemas.house import HouseMutations, HouseQueries
from .schemas.note import NoteMutations, NoteQueries
from .schemas.proposal import ProposalMutations, ProposalQueries


@strawberry.type
class Query(NoteQueries, HealthQueries, AuthQueries, HouseQueries, ProposalQueries):
    pass


@strawberry.type
class Mutation(NoteMutations, AuthMutations, HouseMutations, ProposalMutations):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
