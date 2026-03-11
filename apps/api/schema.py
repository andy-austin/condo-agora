import os

import strawberry
from graphql.validation import NoSchemaIntrospectionCustomRule
from strawberry.extensions import AddValidationRules

from .schemas.analytics import AnalyticsQueries
from .schemas.announcement import AnnouncementMutations, AnnouncementQueries
from .schemas.auth import AuthMutations, AuthQueries
from .schemas.budget import BudgetMutations, BudgetQueries
from .schemas.comment import CommentMutations, CommentQueries
from .schemas.document import DocumentMutations, DocumentQueries
from .schemas.health import HealthQueries
from .schemas.house import HouseMutations, HouseQueries
from .schemas.notification import NotificationMutations, NotificationQueries
from .schemas.project_milestone import (
    ProjectMilestoneMutations,
    ProjectMilestoneQueries,
)
from .schemas.proposal import ProposalMutations, ProposalQueries
from .schemas.proposal_vote import ProposalVoteMutations, ProposalVoteQueries
from .schemas.onboarding import OnboardingMutations
from .schemas.voting import VotingMutations, VotingQueries


@strawberry.type
class Query(
    HealthQueries,
    AuthQueries,
    HouseQueries,
    ProposalQueries,
    CommentQueries,
    AnnouncementQueries,
    NotificationQueries,
    VotingQueries,
    ProposalVoteQueries,
    DocumentQueries,
    ProjectMilestoneQueries,
    BudgetQueries,
    AnalyticsQueries,
):
    pass


@strawberry.type
class Mutation(
    AuthMutations,
    HouseMutations,
    ProposalMutations,
    CommentMutations,
    AnnouncementMutations,
    NotificationMutations,
    VotingMutations,
    ProposalVoteMutations,
    DocumentMutations,
    ProjectMilestoneMutations,
    BudgetMutations,
    OnboardingMutations,
):
    pass


_extensions = []
if os.environ.get("VERCEL_ENV") == "production":
    _extensions.append(AddValidationRules([NoSchemaIntrospectionCustomRule]))

schema = strawberry.Schema(query=Query, mutation=Mutation, extensions=_extensions)
