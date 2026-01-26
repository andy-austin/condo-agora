from prisma.models import Note as NoteModel

from ..graphql_types.note import CreateNoteInput, UpdateNoteInput
from .base import BaseResolver


class NoteResolver(BaseResolver[NoteModel, CreateNoteInput, UpdateNoteInput]):
    model_name = "note"
