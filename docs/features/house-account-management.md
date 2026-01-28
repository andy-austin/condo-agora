# Feature: House Account Management

**Implemented**: January 2026
**Backend**: FastAPI (Strawberry GraphQL + Prisma)
**Frontend**: Next.js (App Router)

## Overview

This feature enables Administrators to manage the inventory of physical housing units (Houses) within their Organization and assign users (Residents) to specific houses. It models the community structure and links digital identities to physical locations.

## Architecture

### Data Model

- **House**: Represents a physical unit (e.g., "Apt 101").
  - `id`: UUID
  - `name`: String
  - `organization_id`: Link to Organization.
  - `residents`: List of OrganizationMembers assigned to this house.
- **OrganizationMember**:
  - Added `house_id` (Nullable): Links a specific user's membership to a House.
- **Invitation**:
  - Added `house_id` (Nullable): Allows inviting a user directly to a house.

### Workflow

1.  **Inventory**: Admin creates `House` entities in the dashboard.
2.  **Assignment**: Admin invites a user to a specific House.
3.  **Onboarding**: When the user accepts the invite (via Clerk), they are automatically linked to that House in the database.
4.  **Lifecycle**: A Resident cannot be removed from their last House without revoking their Organization membership (ensures valid state).

## Backend Implementation (`apps/api`)

### Service (`src/house/service.py`)
- **CRUD**: Create, Read, Update, Delete logic for Houses.
- **Assignment**: Logic to link/unlink Residents.
- **Validation**: Prevents deleting a House if it has residents. Prevents removing a resident's last house link.

### GraphQL API
- **Type**: `House` (with `residents` and `organization` relations).
- **Queries**:
  - `houses(organizationId: ID!)`: List all houses.
  - `house(id: ID!)`: Get details for a specific house.
- **Mutations**:
  - `createHouse`, `updateHouse`, `deleteHouse`.
  - `assignResidentToHouse`: Links a user to a house.
  - `removeResidentFromHouse`: Unlinks a user (downgrades to MEMBER role if valid).

## Frontend Implementation (`apps/web`)

### Pages
- `/dashboard/properties`: List of houses.
- `/dashboard/properties/[id]`: House details and resident management.

### UI/UX Features
- **Smart Defaulting**: If an Organization has only one House (e.g., a single-family home), the UI automatically redirects from the list view to the detail view, and pre-selects that house in forms to reduce friction.
- **Invitation UI**: Extended the Settings page invitation form to include an optional "Assign to House" selector.

## Configuration

### Environment
No specific new environment variables are required for this feature beyond the standard DB and Auth config.

### Permissions
- **Admins**: Can manage Houses and assign Residents.
- **Residents/Members**: Read-only access to their own House data (contextual).

## Future Considerations
- **Multiple Houses**: Currently optimized for 1-House-per-Resident, but the data model supports Many-to-Many if needed in the future (though logic currently enforces "At least one").
- **Import/Export**: Bulk import for large communities.
