from datetime import datetime

import strawberry


@strawberry.type
class Document:
    id: str
    proposal_id: str
    type: str
    file_url: str
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: str
    selected: bool
    created_at: datetime
    updated_at: datetime
