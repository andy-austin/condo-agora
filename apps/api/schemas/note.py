from typing import List, Optional

import strawberry

from ..resolvers.note import NoteResolver
from ..graphql_types.note import CreateNoteInput, Note, UpdateNoteInput
from .base import BaseSchemaGenerator


class NoteSchemaGenerator(
    BaseSchemaGenerator[NoteResolver, Note, CreateNoteInput, UpdateNoteInput]
):
    resolver_class = NoteResolver
    graphql_type = Note


@strawberry.type
class NoteQueries:
    @strawberry.field
    async def notes(self) -> List[Note]:
        return await NoteSchemaGenerator.get_all_query()

    @strawberry.field
    async def note(self, id: int) -> Optional[Note]:
        return await NoteSchemaGenerator.get_by_id_query(id)


@strawberry.type
class NoteMutations:
    @strawberry.field
    async def create_note(self, input: CreateNoteInput) -> Note:
        return await NoteSchemaGenerator.create_mutation(input)

    @strawberry.field
    async def update_note(self, id: int, input: UpdateNoteInput) -> Optional[Note]:
        return await NoteSchemaGenerator.update_mutation(id, input)

    @strawberry.field
    async def delete_note(self, id: int) -> bool:
        return await NoteSchemaGenerator.delete_mutation(id)