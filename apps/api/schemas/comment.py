from typing import List

import strawberry

from ..graphql_types.comment import Comment
from ..resolvers.comment import (
    resolve_comments,
    resolve_create_comment,
    resolve_delete_comment,
    resolve_update_comment,
)


@strawberry.type
class CommentQueries:
    comments: List[Comment] = strawberry.field(resolver=resolve_comments)


@strawberry.type
class CommentMutations:
    create_comment: Comment = strawberry.mutation(resolver=resolve_create_comment)
    update_comment: Comment = strawberry.mutation(resolver=resolve_update_comment)
    delete_comment: bool = strawberry.mutation(resolver=resolve_delete_comment)
