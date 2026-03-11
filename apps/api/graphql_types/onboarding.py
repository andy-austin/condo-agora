from enum import Enum
from typing import List, Optional

import strawberry

from .auth import Organization


@strawberry.enum
class RowStatus(Enum):
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    SKIPPED = "SKIPPED"


@strawberry.input
class BulkSetupRow:
    row_id: str
    property_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


@strawberry.input
class BulkSetupInput:
    organization_name: str
    rows: List[BulkSetupRow]


@strawberry.type
class BulkSetupRowResult:
    row_id: str
    status: RowStatus
    error: Optional[str] = None
    property_id: Optional[str] = None
    user_id: Optional[str] = None


@strawberry.type
class BulkSetupResult:
    organization: Organization
    total_properties: int
    total_residents: int
    rows: List[BulkSetupRowResult]
