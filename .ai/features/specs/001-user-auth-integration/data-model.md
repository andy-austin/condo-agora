# Data Model: User Authentication & Organization

## Entities

### User
Represents a registered identity in the system.
- `id`: String (UUID, PK)
- `email`: String (Unique)
- `hashed_password`: String (Nullable, for OAuth users)
- `full_name`: String
- `avatar_url`: String (Nullable)
- `is_active`: Boolean (Default: true)
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

### Account (Optional/Implicit)
To handle multiple OAuth providers per user, we might normalize this, but for MVP (Google-only), we can store `google_id` on the `User` table or a simple `SocialAccount` table.
- `id`: String (UUID, PK)
- `user_id`: String (FK -> User.id)
- `provider`: String (e.g., "google")
- `provider_id`: String (Unique per provider)
- `created_at`: DateTime

## Relationships
- `User` 1:N `OrganizationMember`
- `Organization` 1:N `OrganizationMember`
- `Organization` 1:N `Invitation`
- `User` 1:N `Invitation` (as inviter)
- `User` 1:N `SocialAccount`
