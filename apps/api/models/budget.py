from .base import BaseDocument


class Budget(BaseDocument):
    proposal_id: str
    approved_amount: float
    spent_amount: float = 0.0
    currency: str = "USD"
    created_by: str
