# Frontend Architecture

The frontend is a Next.js 14 application with React 18 and TypeScript, located in `apps/web/`.

## Directory Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (HTML structure)
│   ├── page.tsx                  # Home/landing page
│   ├── globals.css               # Global styles + Tailwind
│   └── health/
│       └── page.tsx              # Health status page
│
├── components/
│   ├── GraphQLStatusCard.tsx     # API health monitoring
│   ├── landing/                  # Landing page sections
│   │   ├── Header.tsx            # Navigation header
│   │   ├── HeroSection.tsx       # Hero with CTA
│   │   ├── ProblemSection.tsx    # Problem statement
│   │   ├── FeaturesSection.tsx   # Features showcase
│   │   ├── HowItWorks.tsx        # Process steps
│   │   ├── TestimonialsSection.tsx
│   │   ├── LogoCloud.tsx
│   │   ├── CtaSection.tsx
│   │   └── Footer.tsx
│   └── ui/                       # Reusable UI components
│       ├── button.tsx            # Button variants
│       ├── card.tsx              # Card components
│       ├── badge.tsx             # Status badges
│       └── index.ts              # Exports
│
├── hooks/
│   └── useGraphQLStatus.ts       # GraphQL health hook
│
├── lib/
│   └── utils.ts                  # Utility functions (cn)
│
├── tests/
│   └── components/
│       ├── GraphQLStatusCard.test.tsx
│       └── ui/Button.test.tsx
│
├── public/                       # Static assets
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
├── jest.config.js                # Jest test config
└── jest.setup.js                 # Jest setup
```

## App Router Pages

### Root Layout (`app/layout.tsx`)
```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### Home Page (`app/page.tsx`)
Composes landing page from section components:
```tsx
export default function Home() {
  return (
    <main>
      <Header />
      <HeroSection />
      <LogoCloud />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </main>
  )
}
```

### Health Page (`app/health/page.tsx`)
Displays system health status:
```tsx
export default function HealthPage() {
  return (
    <div className="container mx-auto py-8">
      <h1>System Health</h1>
      <GraphQLStatusCard />
    </div>
  )
}
```

## Component Patterns

### Client Components
Components that need interactivity use the `'use client'` directive:

```tsx
'use client'

import { useState, useEffect } from 'react'

export function InteractiveComponent() {
  const [state, setState] = useState(null)
  // ...
}
```

### Server Components (Default)
Static components render on the server by default (no directive needed).

### UI Components (`components/ui/`)

Built with Radix UI primitives and Tailwind CSS:

**Button** (`button.tsx`):
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        destructive: "bg-destructive...",
        outline: "border border-input...",
        secondary: "bg-secondary...",
        ghost: "hover:bg-accent...",
        link: "text-primary underline-offset-4...",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

**Card** (`card.tsx`):
Composable card components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**Badge** (`badge.tsx`):
Status indicators with variants: `default`, `secondary`, `destructive`, `outline`

## Custom Hooks

### `useGraphQLStatus` (`hooks/useGraphQLStatus.ts`)

Monitors GraphQL API health:

```typescript
interface HealthData {
  status: string
  timestamp: string
  api: { status: string }
  database: { status: string; connection: boolean; details: string | null }
}

function useGraphQLStatus(): {
  isConnected: boolean
  isLoading: boolean
  error: string | null
  lastChecked: Date | null
  apiUrl: string
  healthData?: HealthData
  refetch: () => Promise<void>
}
```

Features:
- Auto-refresh every 30 seconds
- Manual refetch capability
- Error handling
- Loading states

## Styling

### Tailwind Configuration (`tailwind.config.js`)

**Color System** (CSS variables):
```javascript
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: { DEFAULT: "hsl(var(--primary))", foreground: "..." },
  secondary: { ... },
  destructive: { ... },
  muted: { ... },
  accent: { ... },
  card: { ... },
  // ...
}
```

**Custom Animations**:
- `accordion-down` / `accordion-up`
- Uses `tailwindcss-animate` plugin

### Global Styles (`app/globals.css`)

Defines CSS variables for theming:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  /* ... */
}
```

## GraphQL Communication

### Making GraphQL Requests

```typescript
const response = await fetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        health {
          status
          api { status }
          database { status connection }
        }
      }
    `
  })
})
const { data, errors } = await response.json()
```

### API Endpoint Routing

**Development** (`next.config.js`):
```javascript
async rewrites() {
  if (process.env.NODE_ENV === 'development') {
    return [{
      source: '/api/graphql/:path*',
      destination: 'http://localhost:8000/graphql/:path*'
    }]
  }
  return []
}
```

**Production**: Handled by `vercel.json` routing.

## Utilities

### `cn()` Function (`lib/utils.ts`)

Merges Tailwind classes with conflict resolution:

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Usage:
```tsx
<div className={cn("base-class", condition && "conditional-class", props.className)} />
```

## Dependencies

**Core**:
- `next ^14.0.0` - React framework
- `react ^18.0.0` - UI library
- `react-dom ^18.0.0` - React DOM

**GraphQL**:
- `@apollo/client ^3.8.0` - GraphQL client (available)
- `graphql ^16.8.0` - GraphQL spec
- `graphql-request ^6.1.0` - Lightweight GraphQL client

**UI**:
- `@radix-ui/react-slot ^1.2.3` - Slot primitive
- `class-variance-authority ^0.7.1` - Variant styling
- `clsx ^2.1.1` - Class merging
- `tailwind-merge ^3.3.1` - Tailwind class merging
- `lucide-react ^0.542.0` - Icons

**Dev**:
- `typescript ^5.0.0`
- `tailwindcss ^3.3.0`
- `jest ^29.7.0`
- `@testing-library/react ^14.1.2`

## Running the Frontend

```bash
# Via TurboRepo (recommended)
pnpm --filter web dev

# Direct execution
cd apps/web && pnpm dev
```

Development server runs at `http://localhost:3000`
