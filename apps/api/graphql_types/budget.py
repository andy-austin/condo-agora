from datetime import datetime

import strawberry


@strawberry.type
class Budget:
    id: str
    proposal_id: str
    approved_amount: float
    spent_amount: float
    currency: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    variance: float
    cost_per_unit: float


@strawberry.type
class FinancialSummary:
    total_approved: float
    total_spent: float
    total_remaining: float
    project_count: int
    currency: str
