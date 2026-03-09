# Design Roadmap - Condo Agora UX/UI Improvements

> Senior Web Designer Review - March 2026
> Focus: Real estate property management UX, eliminating empty desktop screens, professional polish

---

## P0 - Critical (Must Fix)

### 1. Sidebar Navigation with Icons
**Current:** Thin top nav bar with 3 plain text links (Dashboard, Properties, Settings). No icons, no active state, no room to grow.

**Target:** Left sidebar (240px) with:
- Logo at top
- Sections: Overview, Properties, Residents, Proposals, Voting, Reports, Settings
- Each with icons (Building, Users, Lightbulb, Vote, BarChart, Gear)
- Collapsible on mobile (hamburger)
- Active item highlighted with orange accent
- User profile/avatar at bottom of sidebar

**Why:** Fixes wayfinding, scalability, and gives the app a professional structure.

---

### 2. Redesign Dashboard Home with Stats + Activity Feed
**Current:** "Welcome, Juan!" heading + 2 plain cards floating in vast white void. ~80% empty white space.

**Target:**
- **Summary stat cards** (top row): Total Properties, Total Residents, Pending Invitations, Open Proposals
- **Recent Activity feed** (center): "Maria joined Unit 204", "New proposal: Pool renovation"
- **Quick Actions bar**: "Add Property", "Invite Member", "Create Proposal"
- **Onboarding checklist** (for new users): "Set up your first property", "Invite your first resident"
- **2-column layout** on desktop: main content (left 2/3) + sidebar summary (right 1/3)

**Why:** First screen after login must convey value. Currently feels like a prototype.

---

### 3. Proper Error & Empty States with Illustrations
**Current:** Bare red text "Failed to load properties." on completely empty white pages. No retry, no guidance.

**Target:**
- Centered error/empty state illustration (SVG)
- Clear, friendly error message
- "Try Again" primary button
- "Go Back to Dashboard" secondary link
- Subtle background pattern so pages never feel completely blank
- Distinct designs for: error state, empty state (no data yet), loading state

**Why:** Blank pages with tiny red text destroy user confidence immediately.

---

## P1 - High Priority

### 4. Expand Settings into Multi-Section Layout
**Current:** Single "Invite New Member" form (max-w-2xl) centered on huge desktop screen. Classic "empty screen with simple form" problem.

**Target:** Tabbed/sectioned layout:
- **Left column (1/3):** Vertical settings navigation
  - Organization Profile
  - Members & Invitations
  - Roles & Permissions
  - Notifications
  - Billing
- **Right column (2/3):** Content area
  - "Members & Invitations": Members table (name, email, role, status, joined date) + invite form below
  - "Organization Profile": Building name, address, photo, description
  - Fills the screen naturally with purpose

**Why:** Settings pages in SaaS apps must scale. A lone form looks incomplete.

---

### 5. Enrich Property Cards & Detail Pages
**Current:** Property cards show only name + resident count. Detail page shows only editable name + residents list.

**Target - Property Cards:**
- Property type icon (apartment, house, commercial)
- Address / floor / unit number
- Status indicator (occupied/vacant)
- Last activity date
- Thumbnail image or colored type-based placeholder
- Table view toggle for power users managing 50+ units

**Target - Property Detail Page:**
- Header: Property photo/map, full address, type, floor, sqft
- Tabs: Overview | Residents | Proposals | Documents | History
- Overview: Key details card, recent activity, status
- Residents: Full table with contact info, move-in date, role
- Documents: Lease agreements, maintenance records

**Why:** Real estate users expect rich property information. Current pages are too minimal.

---

### 6. Loading Skeletons
**Current:** Text-based "Loading properties..." messages.

**Target:** Shimmer/skeleton placeholders that match final layout shapes (card skeletons, table row skeletons, stat card skeletons).

**Why:** Skeleton screens dramatically improve perceived performance and polish.

---

## P2 - Medium Priority

### 7. Unify Brand Between Landing Page & App
**Current:**
- Landing: Polished, gradients, illustrations, visual richness
- App: Stark white, bare-bones, feels like a different product
- Brand name inconsistency: "Condo Agora" (app) vs "Condo Agora" (landing, missing accent)

**Target:**
- Carry landing page warmth into the app (subtle gradients, accent colors on cards)
- Consistent logo/brand name usage everywhere
- Consistent typography weight and color palette
- Subtle background textures or patterns to reduce stark whiteness

---

### 8. Breadcrumbs + Active Navigation States
**Current:** No indication of current page in navigation. No breadcrumbs on detail pages.

**Target:**
- Active nav item: orange left border + bold text + light orange background
- Breadcrumbs on detail pages: Dashboard > Properties > Unit 204
- Page titles consistent with nav labels

---

### 9. Fix Landing Page Inconsistencies
**Issues found:**
- Mobile mockup images in Spanish while page is in English
- "How It Works" says "four simple steps" but only shows 3
- Footer copyright says 2024
- No social media links in footer
- "Watch Video" button - leads nowhere if no video exists
- "Development mode" badge visible from Clerk (remove for production)

---

## Design Principles for Implementation

1. **No empty screens on desktop** - every page must have purposeful content density
2. **Progressive disclosure** - show summary first, details on demand
3. **Real estate context** - icons, terminology, and layouts that property managers expect
4. **Mobile-first but desktop-rich** - responsive doesn't mean sparse on large screens
5. **Consistent component usage** - leverage shadcn/ui system uniformly
