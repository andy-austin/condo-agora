# Data Model: User Authentication & Organization

## Entities

### User
Represents a registered identity in the system, synchronized from Clerk.
- `id`: String (UUID, PK) - Our internal ID.
- `clerk_id`: String (Unique, Indexed) - The External ID from Clerk.
- `email`: String (Unique)
- `first_name`: String (Nullable)
- `last_name`: String (Nullable)
- `avatar_url`: String (Nullable)
- `created_at`: DateTime
- `updated_at`: DateTime

### Organization
A container for multi-tenant resources (e.g., a Condo).
- `id`: String (UUID, PK)
- `name`: String
- `slug`: String (Unique, for URLs)
- `created_at`: DateTime
- `updated_at`: DateTime

### OrganizationMember
Link table defining membership and roles.
- `id`: String (UUID, PK)
- `user_id`: String (FK -> User.id)
- `organization_id`: String (FK -> Organization.id)
- `role`: Enum (ADMIN, RESIDENT, MEMBER)
- `created_at`: DateTime

### Invitation
A pending invitation to join an organization.
- `id`: String (UUID, PK)
- `email`: String
- `token`: String (Unique, Indexed)
- `organization_id`: String (FK -> Organization.id)
- `inviter_id`: String (FK -> User.id)
- `role`: Enum (ADMIN, RESIDENT, MEMBER)
- `expires_at`: DateTime
- `created_at`: DateTime
- `accepted_at`: DateTime (Nullable)

## Relationships
- `User` 1:N `OrganizationMember`
- `Organization` 1:N `OrganizationMember`
- `Organization` 1:N `Invitation`
- `User` 1:N `Invitation` (as inviter)