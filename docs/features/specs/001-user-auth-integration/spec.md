# Feature Specification: User Authentication Integration

**Feature Branch**: `001-user-auth-integration`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Integrate better-auth to allow users to register/login/invite new users, make sure to include forgot password mechanism and single sign on option"

## Clarifications

### Session 2026-01-25
- Q: SSO Account Linking Policy → A: Automatic Linking: If email matches a verified SSO provider email, automatically link the accounts.
- Q: Invitation Context & Role → A: Org + Role: Inviter selects an Organization and a Role (e.g., Admin, Resident) for the invitee.
- Q: SSO Provider Selection → A: Google Only: Implement Google OAuth2 first.
- Q: Token Expiration Policy → A: Standard: Invites expire in 7 days; Password resets expire in 1 hour.
- Q: Mandatory Organization Context → A: Mandatory: Users must join (via invite) or create an Organization immediately after registration.

## User Scenarios & Testing

### User Story 1 - Email Registration & Login (Priority: P1)

New users can create an account using their email and password, and existing users can verify their identity to access the system.

**Why this priority**: Fundamental requirement for system access and user identification.

**Independent Test**: Can be fully tested by registering a new email, logging out, and logging back in with credentials.

**Acceptance Scenarios**:

1. **Given** a visitor on the registration page, **When** they enter a valid email and strong password, **Then** a new account is created, they are prompted to create a new Organization (or join via code), and then logged in.
2. **Given** an existing user, **When** they enter correct credentials on the login page, **Then** they are authenticated and redirected to the dashboard.
3. **Given** a user, **When** they attempt to register with an already registered email, **Then** an informative error message is displayed.

---

### User Story 2 - User Invitation System (Priority: P2)

Existing authenticated users can invite others to join the platform via email.

**Why this priority**: Enables growth and collaboration by allowing current users to onboard new team members.

**Independent Test**: User A sends an invite to User B's email; User B clicks the link and creates an account.

**Acceptance Scenarios**:

1. **Given** an authenticated user in an organization, **When** they send an invitation to a new email address selecting a specific role (e.g., Resident), **Then** an invitation email containing a unique signup link is delivered to that address.
2. **Given** a recipient with an invite link, **When** they access the link, **Then** they are presented with a registration form that adds them to the inviting organization with the specified role upon completion.
3. **Given** an invalid or expired invite link, **When** accessed, **Then** a relevant error message is shown.

---

### User Story 3 - Single Sign-On (SSO) (Priority: P2)

Users can sign up and log in using Google as an identity provider instead of a password.

**Why this priority**: Reduces friction for onboarding and improves security by relying on established identity providers.

**Independent Test**: A user clicks "Login with Google" and is successfully authenticated without entering a local password.

**Acceptance Scenarios**:

1. **Given** a login page, **When** the user selects the Google SSO provider, **Then** they are redirected to Google and back to the app as an authenticated user.
2. **Given** an existing email-based user, **When** they login via Google SSO with the same email, **Then** the accounts are automatically linked and the user is logged in.

---

### User Story 4 - Forgot Password Flow (Priority: P3)

Users who have lost their password can regain access via an email-based recovery mechanism.

**Why this priority**: Critical fallback to prevent user lockout, though less frequent than login.

**Independent Test**: User requests a password reset, receives email, clicks link, sets new password, and logs in with new password.

**Acceptance Scenarios**:

1. **Given** the login page, **When** a user requests a password reset for a valid email, **Then** a recovery link is sent to that email.
2. **Given** a user with a valid reset link, **When** they submit a new password, **Then** their credentials are updated and they can log in.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to register with an email and password.
- **FR-002**: System MUST allow users to log in with verified credentials.
- **FR-003**: System MUST support logout functionality that invalidates the current session.
- **FR-004**: System MUST allow authenticated users to send invitations to email addresses, specifying an Organization and Role.
- **FR-005**: System MUST validate invitation tokens (valid for 7 days) before allowing registration via invite.
- **FR-006**: System MUST support Google as the primary SSO provider.
- **FR-007**: System MUST provide a "Forgot Password" mechanism that sends a secure reset link (valid for 1 hour).
- **FR-008**: System MUST strictly utilize `better-auth` for the implementation of authentication logic.
- **FR-009**: System MUST automatically link Google SSO accounts to existing User records if the email addresses match and the SSO email is verified.
- **FR-010**: New users registering via invitation MUST be automatically added to the inviting Organization with the assigned Role.
- **FR-011**: System MUST enforce Organization membership; users MUST create or join an Organization immediately upon registration.

### Key Entities

- **User**: Represents an identity (email, password hash, provider info).
- **Session**: Represents an active authenticated state.
- **Invitation**: A record of a pending user (email, token, inviter, organization_id, role, expiration). Note: Default expiration is 7 days.
- **Account**: Linked identity from an SSO provider (if separated from User).
- **Organization**: Context container for users (User + Organization + Role).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Registration process takes less than 2 minutes for a typical user.
- **SC-002**: Login actions complete (UI feedback) in under 1 second.
- **SC-003**: Invitation emails are triggered immediately upon request.
- **SC-004**: 100% of valid password reset flows result in successful access recovery.
