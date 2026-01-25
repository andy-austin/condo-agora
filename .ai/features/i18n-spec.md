# i18n Feature Specification

Add internationalization (i18n) support to both frontend and backend with Spanish as default and English as secondary language.

## Configuration
- **Languages**: Spanish (es) + English (en)
- **Default**: Spanish (es)
- **URL Strategy**: Auto-detect from browser (no path prefix)
- **Backend Scope**: Minimal - returns translation keys, frontend translates

---

## Phase 1: Frontend i18n Setup

### 1.1 Install Dependencies
```bash
cd apps/web && pnpm add next-intl
```

**Why next-intl**: Best library for Next.js App Router, supports both server and client components, lightweight.

### 1.2 Create Translation Files

**Create**: `apps/web/messages/es.json` (Spanish - extract from current components)
**Create**: `apps/web/messages/en.json` (English translations)

Structure:
```json
{
  "metadata": {
    "title": "Condo Ágora",
    "description": "..."
  },
  "header": {
    "features": "Características",
    "howItWorks": "Cómo Funciona",
    "testimonials": "Testimonios",
    "login": "Iniciar Sesión",
    "requestDemo": "Solicitar Demo"
  },
  "hero": { ... },
  "features": { ... },
  "problems": { ... },
  "howItWorks": { ... },
  "testimonials": { ... },
  "cta": { ... },
  "footer": { ... },
  "health": { ... }
}
```

### 1.3 Configure i18n

**Create**: `apps/web/i18n/config.ts`
```typescript
export const locales = ['es', 'en'] as const;
export const defaultLocale = 'es' as const;
export type Locale = (typeof locales)[number];
```

**Create**: `apps/web/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Detect locale from cookie, Accept-Language header, or default
  const locale = detectLocale(); // implementation details
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

### 1.4 Add Middleware for Locale Detection

**Create**: `apps/web/middleware.ts`
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,  // Auto-detect from Accept-Language
  localePrefix: 'never'   // No URL prefix (auto-detect only)
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

### 1.5 Update Next.js Config

**Modify**: `apps/web/next.config.js`
```javascript
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  // existing config...
};

module.exports = withNextIntl(nextConfig);
```

### 1.6 Update Root Layout

**Modify**: `apps/web/app/layout.tsx`
- Add `NextIntlClientProvider`
- Dynamic `lang` attribute from detected locale
- Dynamic metadata based on locale

### 1.7 Create Translation Hook Helper

**Create**: `apps/web/hooks/useTranslation.ts`
- Wrapper around `useTranslations` from next-intl
- Type-safe access to translation keys

### 1.8 Create Language Switcher Component

**Create**: `apps/web/components/LanguageSwitcher.tsx`
- Toggle between Spanish/English
- Stores preference in cookie
- Add to Header component

---

## Phase 2: Refactor Frontend Components

### 2.1 Landing Page Components to Update

| Component | Strings | Approach |
|-----------|---------|----------|
| Header.tsx | ~10 | Use `useTranslations('header')` |
| HeroSection.tsx | ~6 | Use `useTranslations('hero')` |
| FeaturesSection.tsx | ~16 | Use `useTranslations('features')` |
| ProblemSection.tsx | ~9 | Use `useTranslations('problems')` |
| HowItWorks.tsx | ~12 | Use `useTranslations('howItWorks')` |
| TestimonialsSection.tsx | ~11 | Use `useTranslations('testimonials')` |
| CtaSection.tsx | ~5 | Use `useTranslations('cta')` |
| LogoCloud.tsx | ~2 | Use `useTranslations('logoCloud')` |
| Footer.tsx | ~20 | Use `useTranslations('footer')` |

**Pattern for refactoring:**
```typescript
// Before
<h1>Decisiones claras</h1>

// After
const t = useTranslations('hero');
<h1>{t('headline')}</h1>
```

### 2.2 Health Page

**Modify**: `apps/web/app/health/page.tsx`
**Modify**: `apps/web/components/GraphQLStatusCard.tsx`
- Add translations for status messages

---

## Phase 3: Backend i18n (Minimal)

### 3.1 Create Translation Keys Module

**Create**: `apps/api/i18n/__init__.py`
**Create**: `apps/api/i18n/keys.py`

```python
class StatusKeys:
    OK = "status.ok"
    DEGRADED = "status.degraded"
    ERROR = "status.error"
    UNKNOWN = "status.unknown"

class DatabaseKeys:
    CONNECTED = "database.connected"
    CONNECTION_ERROR = "database.connectionError"
    QUERY_ERROR = "database.queryError"
```

### 3.2 Update Health Resolver

**Modify**: `apps/api/resolvers/health.py`
- Return translation keys instead of hardcoded strings
- Frontend maps keys to translated strings

```python
# Before
health_data["status"] = "ok"
health_data["database"]["details"] = "Connected successfully"

# After
health_data["status"] = StatusKeys.OK
health_data["database"]["details"] = DatabaseKeys.CONNECTED
```

### 3.3 Add Accept-Language Header Parsing (Optional)

**Create**: `apps/api/i18n/middleware.py`
- Parse Accept-Language header
- Make locale available in request context
- For future use if backend needs to return translated strings

---

## Phase 4: Translation Content

### 4.1 Spanish Translations (es.json)
Extract all current hardcoded Spanish text from components (already exists in code).

### 4.2 English Translations (en.json)
Translate all Spanish content to English.

**Key sections to translate:**
- Landing page (~95 strings)
- Health status page (~10 strings)
- Metadata (title, description)
- Error messages and status indicators

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/messages/es.json` | Spanish translations |
| `apps/web/messages/en.json` | English translations |
| `apps/web/i18n/config.ts` | i18n configuration |
| `apps/web/i18n/request.ts` | Server-side locale detection |
| `apps/web/middleware.ts` | Locale detection middleware |
| `apps/web/components/LanguageSwitcher.tsx` | Language toggle UI |
| `apps/api/i18n/__init__.py` | Backend i18n module |
| `apps/api/i18n/keys.py` | Translation key constants |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/package.json` | Add next-intl dependency |
| `apps/web/next.config.js` | Add next-intl plugin |
| `apps/web/app/layout.tsx` | Add i18n provider, dynamic lang |
| `apps/web/components/landing/Header.tsx` | Use translations + add switcher |
| `apps/web/components/landing/HeroSection.tsx` | Use translations |
| `apps/web/components/landing/FeaturesSection.tsx` | Use translations |
| `apps/web/components/landing/ProblemSection.tsx` | Use translations |
| `apps/web/components/landing/HowItWorks.tsx` | Use translations |
| `apps/web/components/landing/TestimonialsSection.tsx` | Use translations |
| `apps/web/components/landing/CtaSection.tsx` | Use translations |
| `apps/web/components/landing/LogoCloud.tsx` | Use translations |
| `apps/web/components/landing/Footer.tsx` | Use translations |
| `apps/web/components/GraphQLStatusCard.tsx` | Use translations |
| `apps/web/app/health/page.tsx` | Use translations |
| `apps/api/resolvers/health.py` | Return translation keys |

---

## Verification

1. **Build check**: `pnpm build` - ensure no compilation errors
2. **Dev server**: `pnpm dev` - verify both languages work
3. **Language detection**:
   - Set browser to Spanish → see Spanish content
   - Set browser to English → see English content
4. **Language switcher**: Toggle between languages, verify cookie persistence
5. **Health page**: Verify status messages translate correctly
6. **Lint**: `pnpm lint` - ensure no linting errors
7. **Tests**: `pnpm test` - update/add tests for i18n components

---

## Implementation Order

1. Install dependencies and configure next-intl
2. Create translation files with Spanish content (extract from components)
3. Set up middleware and layout
4. Create LanguageSwitcher component
5. Refactor components one by one (Header → Hero → Features → ...)
6. Add English translations
7. Update backend health resolver
8. Test and verify
