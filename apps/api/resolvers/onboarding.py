import strawberry

from ..graphql_types.auth import Organization
from ..graphql_types.onboarding import (
    BulkSetupInput,
    BulkSetupResult,
    BulkSetupRowResult,
    RowStatus,
)
from ..src.onboarding.service import bulk_setup_organization


async def resolve_bulk_setup_organization(
    info: strawberry.types.Info, input: BulkSetupInput
) -> BulkSetupResult:
    """Resolver for bulk organization setup. Authenticated users only."""
    user = info.context.get("user")
    if not user:
        raise Exception("Authentication required")

    user_id = user.get("id") or str(user.get("_id"))

    rows_data = [
        {
            "row_id": row.row_id,
            "property_name": row.property_name,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "phone": row.phone,
        }
        for row in input.rows
    ]

    result = await bulk_setup_organization(
        organization_name=input.organization_name,
        rows=rows_data,
        creator_user_id=user_id,
    )

    org = result["organization"]
    return BulkSetupResult(
        organization=Organization(
            id=str(org["_id"]),
            name=org["name"],
            slug=org["slug"],
            created_at=org["created_at"],
            updated_at=org["updated_at"],
        ),
        total_properties=result["total_properties"],
        total_residents=result["total_residents"],
        rows=[
            BulkSetupRowResult(
                row_id=r["row_id"],
                status=RowStatus(r["status"]),
                error=r.get("error"),
                property_id=r.get("property_id"),
                user_id=r.get("user_id"),
            )
            for r in result["rows"]
        ],
    )
