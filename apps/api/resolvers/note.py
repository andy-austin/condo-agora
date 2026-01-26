from ..graphql_types.note import CreateNoteInput, UpdateNoteInput
from ..prisma_client.models import Note as NoteModel
from .base import BaseResolver


class NoteResolver(BaseResolver[NoteModel, CreateNoteInput, UpdateNoteInput]):
    model_name = "note"
