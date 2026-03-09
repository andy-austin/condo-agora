import strawberry

from .schemas.announcement import AnnouncementMutations, AnnouncementQueries
from .schemas.auth import AuthMutations, AuthQueries
from .schemas.comment import CommentMutations, CommentQueries
from .schemas.document import DocumentMutations, DocumentQueries
from .schemas.health import HealthQueries
from .schemas.house import HouseMutations, HouseQueries
from .schemas.note import NoteMutations, NoteQueries
from .schemas.notification import NotificationMutations, NotificationQueries
from .schemas.project_milestone import (
    ProjectMilestoneMutations,
    ProjectMilestoneQueries,
)
from .schemas.proposal import ProposalMutations, ProposalQueries
from .schemas.voting import VotingMutations, VotingQueries


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
    VotingQueries,
    DocumentQueries,
    ProjectMilestoneQueries,
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
    VotingMutations,
    DocumentMutations,
    ProjectMilestoneMutations,
):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)
