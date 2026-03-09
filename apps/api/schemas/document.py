from typing import List

import strawberry

from ..graphql_types.document import Document
from ..resolvers.document import (
    resolve_attach_document,
    resolve_delete_document,
    resolve_documents,
    resolve_mark_quote_selected,
)


@strawberry.type
class DocumentQueries:
    documents: List[Document] = strawberry.field(resolver=resolve_documents)


@strawberry.type
class DocumentMutations:
    attach_document: Document = strawberry.mutation(resolver=resolve_attach_document)
    delete_document: bool = strawberry.mutation(resolver=resolve_delete_document)
    mark_quote_selected: Document = strawberry.mutation(
        resolver=resolve_mark_quote_selected
    )
