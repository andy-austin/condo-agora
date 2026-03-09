import strawberry

from .schemas.announcement import AnnouncementMutations, AnnouncementQueries
from .schemas.auth import AuthMutations, AuthQueries
from .schemas.comment import CommentMutations, CommentQueries
from .schemas.health import HealthQueries
from .schemas.house import HouseMutations, HouseQueries
from .schemas.note import NoteMutations, NoteQueries
from .schemas.notification import NotificationMutations, NotificationQueries
from .schemas.proposal import ProposalMutations, ProposalQueries


@strawberry.type
class Query(
    NoteQueries,
    HealthQueries,
    AuthQueries,
    HouseQueries,
    ProposalQueries,
    CommentQueries,
    AnnouncementQueries,
    NotificationQueries,
):
    pass


@strawberry.type
class Mutation(
    NoteMutations,
    AuthMutations,
    HouseMutations,
    ProposalMutations,
    CommentMutations,
    AnnouncementMutations,
    NotificationMutations,
):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
