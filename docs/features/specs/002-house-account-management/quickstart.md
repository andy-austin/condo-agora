# Quickstart: House Account Management

## Prerequisites
- Feature 001 (User Auth) completed.
- Prisma Migrations applied.

## Setup
1. **Migrations**: Apply schema changes.
   ```bash
   pnpm --filter api prisma:migrate
   ```
2. **Generate Client**:
   ```bash
   pnpm --filter api prisma:generate
   ```

## Usage

### Managing Houses (Admin)
1.  **Create House**:
    - Use `createHouse` mutation.
    - Input: `organizationId` (from current user context), `name`.
2.  **List Houses**:
    - Query `houses(organizationId: "...")`.
    - Check `organization { housesCount }` for UI adaptation.

### Inviting Residents
1.  **Send Invite**:
    - Use `createInvitation` (extended).
    - Pass `houseId` to link immediately.
2.  **Accept Invite**:
    - User clicks link -> Sign Up -> `accept_invitation` service.
    - Verify `OrganizationMember` has `houseId` set.

## Testing
- **Unit**: Test `House` CRUD service in `apps/api/tests/house/`.
- **Integration**: Test full Invite flow with `houseId`.
