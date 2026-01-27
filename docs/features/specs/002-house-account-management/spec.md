# Feature Specification: House Account Management

**Feature Branch**: `002-house-account-management`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "Gestión de Cuentas por Casa: Los administradores asignan un usuario único a cada vivienda para garantizar que solo los residentes participen. Haz preguntas pero escribe la documentación y el codigo en ingles"

## Clarifications

### Session 2026-01-26
- Q: What happens if a Resident is removed from their last house? → A: System MUST prevent removing the last House link; the Admin must revoke the Organization Membership entirely to remove access.
- Q: What happens if an invited email belongs to an existing user? → A: System MUST support account merging; the existing user can log in to accept the invite and gain the new House/Organization link.
- Q: How should the UI adapt for Single-House Organizations? → A: Smart Defaulting: Pre-select the single house in forms and hide redundant list views to simplify the experience.
- Q: What metadata should a House have? → A: A simple name string (e.g., "Block A - Unit 101").
- Q: What happens to the House entity if a Resident is deleted? → A: Only the link is removed; the House entity itself MUST be preserved in the inventory.

## User Scenarios & Testing

### User Story 1 - House Inventory Management (Priority: P1)

As an Administrator, I want to manage the inventory of physical housing units (Houses) in my Organization so that I can represent the community structure correctly.

**Acceptance Scenarios**:

1.  **Given** an Admin in the Dashboard, **When** they access the "Properties" section, **Then** they see a list of all Houses in the Organization.
2.  **Given** a new community, **When** the Admin creates a new House (e.g., "Unit 101"), **Then** it is added to the inventory.
3.  **Given** an Organization with only one House (e.g., a single family home managed as an Org), **Then** the UI simplifies to show just that context without overwhelming lists (e.g., "Properties" link goes directly to the House detail).

### User Story 2 - Assigning Residents to Houses (Priority: P1)

As an Administrator, I want to invite residents to specific houses via email so that they can securely access the platform as verified members.

**Acceptance Scenarios**:

1.  **Given** a specific House (e.g., "Unit 101"), **When** the Admin sends an invitation to `resident@example.com`, **Then** the system sends an email with a unique signup link linked to that House.
2.  **Given** a user clicks the invitation link and signs up, **When** registration is complete, **Then** they are automatically:
    - Added to the Organization as a "Resident".
    - Linked to "Unit 101".
3.  **Given** a House with existing residents, **When** the Admin invites another person (e.g., spouse/child) to the same House, **Then** the system allows it (supporting multiple residents per house).

### User Story 3 - Resident Identity (Priority: P2)

As a Resident, I want my profile to reflect my housing unit so that neighbors and admins know where I live.

**Acceptance Scenarios**:

1.  **Given** a Resident logs in, **When** they view their profile or post in the community, **Then** their assigned House (e.g., "Unit 101") is displayed next to their name.

## Requirements

### Functional Requirements

- **FR-001 (House Management)**: System MUST allow Administrators to Create, Read, Update, and Delete `House` entities within their Organization.
  - A House MUST have a name/identifier (e.g., "Apt 1B").
- **FR-002 (Data Model)**: A `House` MUST belong to exactly one `Organization`.
- **FR-003 (Residency)**: System MUST support linking an `OrganizationMember` (User) to a `House`.
  - Cardinality: A House CAN have multiple assigned Users (Residents).
  - Cardinality: A User SHOULD belong to at least one House if their role is "Resident".
  - **Lifecycle**: System MUST prevent removing a Resident's last House assignment. To remove a resident who has moved out, the Administrator MUST revoke their entire Organization Membership.
  - **Cleanup**: Deleting an Organization Member MUST NOT delete the associated House entity.
- **FR-004 (Invitation Flow)**: The existing Invitation system MUST be extended to optionally include a `House ID`.
  - When an invitation with a House ID is accepted, the user MUST be automatically assigned to that House.
  - **Account Merging**: If the invited email matches an existing user, they MUST be able to log in to accept the invite, adding the new House/Organization link to their existing identity.
- **FR-005 (Single-House Support)**: The UI MUST adapt for Organizations that contain only a single House.
  - **Smart Defaulting**: Forms requiring a House selection MUST pre-select the house and hide the selector if only one house exists.
  - **Navigational Shortcuts**: In single-house organizations, navigation items that would normally list houses (e.g., "Properties") SHOULD link directly to the single house's management page.

### Edge Cases & Error Handling

- **EC-001 (Duplicate Invite)**: If a user is invited to a House they are already assigned to, the system SHOULD prevent sending a duplicate invite or gracefully handle the acceptance (idempotent).
- **EC-002 (Existing User)**: When an existing user accepts an invite, the system MUST NOT overwrite their existing profile data (name, avatar), only add the new membership.

### Non-Functional Requirements

- **NFR-001**: Invitations must expire after 7 days (consistency with existing auth).
- **NFR-002**: Assignment of a user to a house must be visible to other Admins immediately.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of Users with the "RESIDENT" role are linked to a House entity.
- **SC-002**: Administrators can successfully create a House and send an invite in under 2 minutes.
- **SC-003**: System correctly handles Organizations ranging from 1 House to 500+ Houses.

## Key Entities

- **House**:
  - `id`: UUID
  - `name`: String (e.g., "Unit 101")
  - `organization_id`: UUID
- **OrganizationMember** (Updated):
  - Adds `house_id`: UUID (Nullable, FK -> House)

## Assumptions

- An Organization already exists (from Feature 001).
- Users sign up via Clerk (from Feature 001).
- "Resident" is a role defined in the `Role` enum.