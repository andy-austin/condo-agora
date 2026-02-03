from ..graphql_types.note import CreateNoteInput, UpdateNoteInput
from ..models.note import Note
from .base import BaseResolver


class NoteResolver(BaseResolver[Note, CreateNoteInput, UpdateNoteInput]):
    collection_name = "notes"
    model_class = Note
