# Data Model: House Account Management

## New Entities

### House
Represents a physical housing unit within an Organization.
- `id`: UUID (PK)
- `name`: String (e.g., "Unit 101", "Block A - 404")
- `organization_id`: UUID (FK -> Organization.id)
- `created_at`: DateTime
- `updated_at`: DateTime

## Modified Entities

### OrganizationMember
- **Add**: `house_id`: UUID (Nullable, FK -> House.id)
  - Links the member to a specific house.
  - Constraint: `house.organization_id` MUST match `organization_member.organization_id` (App Logic).

### Invitation
- **Add**: `house_id`: UUID (Nullable, FK -> House.id)
  - Allows inviting a user directly to a house.

## Relationships

- `Organization` 1:N `House` (Cascade Delete optional, usually restrict)
- `House` 1:N `OrganizationMember` (One House has many Residents)
- `House` 1:N `Invitation`
