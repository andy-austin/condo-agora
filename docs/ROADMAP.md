# Condo Agora - Product Roadmap

> Last updated: 2026-03-08

## Current State

### Already Built & Functional

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (Clerk) | **Done** | Sign-in, sign-up, webhooks, user sync |
| Organization & House CRUD | **Done** | Create, read, update, delete properties |
| Resident Assignment | **Done** | Assign/remove users to houses, role badges |
| Invitation System | **Done** | Email invites, 7-day expiry, auto-accept on signup |
| Role System (ADMIN/RESIDENT/MEMBER) | **Done** | DB model + enum, no permission enforcement in UI yet |
| Landing Page (EN/ES) | **Done** | Hero, features, pricing, testimonials, i18n |
| Health Monitoring | **Done** | API + DB health status page |
| E2E Test Coverage | **Done** | Properties, residents, invitations, auth, landing |

---

## Phase 0 - Foundation Hardening

> Secure the base before adding features.

- **P0.1** Role-based access control enforcement (ADMIN vs RESIDENT vs MEMBER permissions on all mutations)
- **P0.2** One-account-per-unit enforcement (prevent duplicate assignments, validation on backend)
- **P0.3** Multi-admin committee UI (list admins, admin-only actions gated in dashboard)
- **P0.4** Organization onboarding flow (create org, set up houses, invite first admins)

---

## Phase 1 - Proposals Core

> The heart of the platform — residents proposing and evaluating improvements.

- **P1.1** `Proposal` data model (title, description, category, status, author, responsible_unit, created_at)
- **P1.2** Create Proposal UI (form with title, description, category tags like "Security", "Infrastructure", "Common Areas")
- **P1.3** Proposal listing page (filterable by status: Draft, Open, Voting, Approved, In Progress, Completed, Rejected)
- **P1.4** Proposal detail page (full description, status badge, author info, timeline)
- **P1.5** Admin moderation (approve/reject proposals for voting, assign responsible unit)

---

## Phase 2 - Discussion & Engagement

> Build community participation around proposals.

- **P2.1** `Comment` data model (proposal_id, author_id, content, created_at, parent_id for threads)
- **P2.2** Comments section below each proposal (threaded, with author name + unit)
- **P2.3** Official Announcements panel (admin-only creation, visible on dashboard home)
- **P2.4** Notification system (new proposal, status change, new comment on your proposal)
- **P2.5** Activity feed on dashboard (recent proposals, comments, announcements)

---

## Phase 3 - Voting & Decision Engine

> The democratic mechanism that makes Condo Agora unique.

- **P3.1** `Vote` data model (proposal_id, house_id, rankings[], submitted_at) — one vote per unit
- **P3.2** Priority ranking voting UI (drag-and-drop or numbered ranking of open proposals)
- **P3.3** 66% approval threshold logic (auto-mark proposals as "Approved" when >2/3 of total units vote favorably)
- **P3.4** Real-time project ranking dashboard (visual bar chart or ranked list showing vote distribution)
- **P3.5** Voting period management (admin sets open/close dates, automatic status transitions)
- **P3.6** Voting results page (transparent breakdown per proposal, participation rate)

---

## Phase 4 - Document Management & Project Execution

> From approved proposal to executed project.

- **P4.1** File upload infrastructure (S3/Vercel Blob for storage)
- **P4.2** `Document` data model (proposal_id, type: quote/design/warranty/receipt, file_url, uploaded_by)
- **P4.3** Document section on proposal detail (upload, preview, download)
- **P4.4** Quote comparison view (side-by-side vendor quotes for a proposal)
- **P4.5** Project execution tracking (milestones, progress %, responsible unit updates)

---

## Phase 5 - Analytics & Transparency

> Build trust through data visibility.

- **P5.1** Community dashboard (total proposals, approval rate, active projects, participation stats)
- **P5.2** Financial transparency view (approved budgets, spent vs. allocated per project)
- **P5.3** Historical archive (completed projects with before/after, final costs, timeline)
- **P5.4** Participation reports (voting turnout per unit, engagement metrics)

---

## Proposed Additional Features

| Feature | Rationale | Phase |
|---------|-----------|-------|
| Maintenance Request System | High-frequency need — report broken things (elevator, lights, pipes). Different from proposals. | 3 |
| Shared Expense Splitting | Calculate cost per unit for approved projects, track payment status. | 4 |
| Meeting Minutes Module | Condo assemblies are legally required in LATAM. Record decisions, attendance, link to proposals. | 4 |
| Vendor Directory | Curated contractors/vendors with ratings from past projects. | 5 |
| Emergency Broadcast | Push/SMS for emergencies (water shutoff, security). High-priority, immediate. | 3 |
| Common Area Reservations | Book party rooms, BBQ areas, pools. High engagement, drives daily usage. | 5 |
| Monthly Fee Tracking | HOA/condo fee payments per unit. Integration with Stripe/MercadoPago. | 6 |
| Multi-language Expansion | EN/ES exists. Add PT-BR for Brazilian market (massive condo market). | Any |
| Mobile PWA / Native App | 80%+ mobile usage. PWA first, native later. | 3+ |
| Audit Log | Record who did what and when — legally important for condo governance. | 2 |

---

## Priority & Timeline

| Phase | Scope | Estimated Effort |
|-------|-------|-----------------|
| Phase 0 | Foundation Hardening | 2-3 weeks |
| Phase 1 | Proposals Core | 3-4 weeks |
| Phase 2 | Discussion & Engagement | 2-3 weeks |
| Phase 3 | Voting & Decision Engine | 3-4 weeks |
| Phase 4 | Document Management | 2-3 weeks |
| Phase 5 | Analytics & Transparency | Ongoing |
