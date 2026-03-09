from typing import List

import strawberry

from ..graphql_types.project_milestone import ProjectMilestone
from ..resolvers.project_milestone import (
    resolve_create_project_milestone,
    resolve_delete_project_milestone,
    resolve_project_milestones,
    resolve_update_milestone_status,
)


@strawberry.type
class ProjectMilestoneQueries:
    project_milestones: List[ProjectMilestone] = strawberry.field(
        resolver=resolve_project_milestones
    )


@strawberry.type
class ProjectMilestoneMutations:
    create_project_milestone: ProjectMilestone = strawberry.mutation(
        resolver=resolve_create_project_milestone
    )
    update_milestone_status: ProjectMilestone = strawberry.mutation(
        resolver=resolve_update_milestone_status
    )
    delete_project_milestone: bool = strawberry.mutation(
        resolver=resolve_delete_project_milestone
    )
