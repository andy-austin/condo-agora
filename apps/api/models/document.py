from .base import BaseDocument


class Document(BaseDocument):
    proposal_id: str
    type: str  # QUOTE, DESIGN, WARRANTY, RECEIPT, OTHER
    file_url: str
    file_name: str
    file_size: int  # bytes
    mime_type: str
    uploaded_by: str  # user_id
    selected: bool = False  # for quotes: admin can mark as selected
