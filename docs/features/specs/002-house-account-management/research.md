# Research: House Account Management

**Feature**: House Account Management
**Date**: 2026-01-26

## Decision 1: Data Modeling for Residency

**Question**: Where should the link between a User and a House be stored?

**Options**:
1.  **Direct User Link**: `User.houseId`.
2.  **Membership Link**: `OrganizationMember.houseId`.
3.  **Separate Join Table**: `Resident` table linking `User` and `House`.

**Decision**: **Option 2 (Membership Link)**.

**Rationale**:
- A User's residency is specific to their membership in an Organization.
- `OrganizationMember` already represents the "User in this Organization" context.
- Avoids polluting the global `User` object (which could be in multiple Orgs).
- Simpler than a separate `Resident` table since we settled on "Demote to Member" lifecycle (Role is on `OrganizationMember`).

**Implications**:
- `OrganizationMember` table gets a `houseId` column (nullable).
- Application logic must verify that `OrganizationMember.organizationId` matches `House.organizationId` when assigning.

## Decision 2: Invitation Schema Extension

**Question**: How to invite a user to a specific house?

**Decision**: Add nullable `houseId` to `Invitation` model.

**Rationale**:
- Extends existing flow naturally.
- When `accept_invitation` is called, if `invitation.houseId` is present, the new `OrganizationMember` record is created with that `houseId`.
- No new "HouseInvitation" entity needed.

## Decision 3: Single-House Detection

**Question**: How does the frontend know to apply "Smart Defaulting"?

**Decision**: The `Organization` GraphQL type will expose a `houses` field (list).

**Rationale**:
- Frontend queries `organization { houses { id name } }`.
- If `houses.length === 1`, apply Smart Defaulting (pre-select, direct link).
- If `houses.length === 0`, show "Create House" prompt.
- If `houses.length > 1`, show standard list/selector.
