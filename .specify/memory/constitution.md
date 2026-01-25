<!--
SYNC IMPACT REPORT
Version: 1.0.0 (Initial Ratification)
Changes:
- Replaced templates with concrete principles based on user request and project context.
- Defined Principles:
  1. Code Quality & Type Safety
  2. Comprehensive Testing Strategy
  3. User Experience & Design Consistency
  4. Performance & Scalability
- Defined Technical Constraints (Stack details from README)
- Defined Development Workflow
- Governance: Established version 1.0.0

Templates Status:
- .specify/templates/plan-template.md: ✅ Compatible (Generic checks align)
- .specify/templates/spec-template.md: ✅ Compatible (Testing section aligns)
- .specify/templates/tasks-template.md: ✅ Compatible (Test tasks included)

Follow-up:
- Ensure CI pipelines in .github/workflows enforce the mentioned linting/testing rules (Already present in file tree).
-->
# Condo Agora Constitution

## Core Principles

### I. Code Quality & Type Safety
Strict adherence to project standards is required to maintain maintainability and reduce bugs.
- **Type Safety**: TypeScript `strict` mode is mandatory for web. Python code must be fully type-hinted (mypy/pyright compliant). `any` or `Dict[Any, Any]` usage must be explicitly justified.
- **Linting**: No code is committed without passing ESLint/Prettier (Web) and Black/Isort/Flake8 (API).
- **Style**: Follow established patterns (e.g., Service layer for logic, Resolvers for transport). Comments should explain "why", not "what".

### II. Comprehensive Testing Strategy
Confidence in deployment comes from rigorous automated testing.
- **Mandate**: No feature is complete without tests. Logic without tests is considered technical debt.
- **Unit Tests**: Cover individual functions and business logic (Jest/Pytest).
- **Integration Tests**: Verify API endpoints, GraphQL resolvers, and database interactions (using test DB).
- **Failure**: A failed test in CI blocks merging. Flaky tests must be fixed or isolated immediately.

### III. User Experience & Design Consistency
The application must feel cohesive, responsive, and professional.
- **Design System**: UI must use existing components and Tailwind utility classes. Do not introduce arbitrary CSS values.
- **Feedback**: Every user action (save, load, delete) requires visible feedback (spinners, toasts, error messages).
- **Accessibility**: Components must be accessible (keyboard navigation, ARIA labels).
- **Error Handling**: Graceful degradation; users should never see raw stack traces or "white screens of death".

### IV. Performance & Scalability
Performance is a feature, not an afterthought.
- **Frontend**: Optimize Core Web Vitals (LCP, CLS, INP). Minimise bundle sizes. Use Next.js image optimization.
- **Backend**: Avoid N+1 queries in GraphQL resolvers (use Dataloaders). Optimize database indices.
- **Latency**: API responses should aim for <100ms for standard reads.
- **Resources**: Clean up subscriptions and connections.

## Technical Constraints & Standards

### Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Backend**: Python FastAPI, Strawberry GraphQL, Prisma (Python Client).
- **Database**: PostgreSQL.
- **Communication**: All Client-Server data exchange must occur via GraphQL.

### Security
- **Auth**: Secure authentication flows (e.g., HttpOnly cookies).
- **Data**: Validate all inputs at the API boundary (Pydantic/Strawberry).
- **Secrets**: Never commit `.env` files or secrets to git.

## Development Workflow

### Process
1.  **Specs**: Features begin with a clear specification and plan (using `.specify` templates).
2.  **Branches**: Use descriptive names (`feat/user-auth`, `fix/login-bug`).
3.  **Reviews**: Peer reviews required. Reviewers must verify compliance with this Constitution.
4.  **CI/CD**: Automation guards the `main` branch.

## Governance

This Constitution serves as the primary source of truth for engineering standards.
- **Amendments**: Proposed changes must be submitted via PR to `.specify/memory/constitution.md` and ratified by the team lead.
- **Compliance**: "Constitution Check" is a mandatory step in the planning phase.
- **Versioning**: Follows Semantic Versioning (MAJOR.MINOR.PATCH).

**Version**: 1.0.0 | **Ratified**: 2026-01-25 | **Last Amended**: 2026-01-25