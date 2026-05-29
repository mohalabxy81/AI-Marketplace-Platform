# SPEC 16 — FRONTEND SYSTEMS SPECIFICATION

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Marketplace & UI Team

---

## 1. Frontend Architecture Overview

The platform frontend is a **Domain-Driven Micro-Frontend Architecture** serving three fundamentally different personas — each with their own performance, security, and UX requirements. The architecture enforces strict domain boundaries at the UI layer, mirroring the backend domain decomposition.

### 1.1 Client Application Topology

| Application | Persona | Framework | Rendering | CDN | Primary SLO |
|:------------|:--------|:----------|:----------|:----|:------------|
| **Marketplace Storefront** | Public users, B2B buyers | Next.js 15 (App Router) | SSR + ISR + Edge | Cloudflare | LCP < 2.5s, TTI < 3.5s |
| **Tenant Dashboard** | Tenant Owners, Admins, Members | Next.js 15 (App Router) | SSR (auth shell) + CSR (data grids) | Cloudflare | FID < 100ms |
| **Platform Console** | Super Admins, SRE | React 18 SPA (Vite) | CSR | Internal CDN | Availability > 99.9% |
| **Embedded Widget** | Third-party partners | Vanilla JS + Web Components | CSR (isolated shadow DOM) | Cloudflare | Bundle < 15KB gzipped |
| **Realtime Notification Layer** | All authenticated users | Shared module | N/A (WebSocket layer) | N/A | Connection latency < 500ms |

### 1.2 Monorepo Structure

The frontend applications live in a **Turborepo monorepo** with the following package structure:

```
apps/
  storefront/          — Next.js Marketplace Storefront
  tenant-dashboard/    — Next.js Tenant Dashboard
  platform-console/    — Vite SPA Platform Console
  widget/              — Embedded Widget (Vanilla JS)

packages/
  ui/                  — Shared React component library (Radix + Tailwind)
  design-tokens/       — CSS custom properties, Tailwind config
  api-client/          — Auto-generated type-safe API client (openapi-typescript)
  realtime-client/     — Supabase Realtime WebSocket abstraction
  auth-utils/          — JWT parsing, session management utilities
  analytics-tracker/   — Client-side analytics event emitter
  zod-schemas/         — Shared Zod validation schemas (mirrors backend)
  tsconfig/            — Shared TypeScript configurations
  eslint-config/       — Shared ESLint rules
```

---

## 2. Design System Specification

### 2.1 Design Token Architecture

All visual decisions are encoded in design tokens. No raw color values, sizes, or font strings are permitted in component code. The `design-tokens` package is the single source of truth.

**Color System:**
```
Semantic Tokens (use these in components):
  --color-primary-{50-950}    — Brand primary (e.g., blue-indigo range)
  --color-success-{50-950}    — Positive states
  --color-warning-{50-950}    — Caution states
  --color-error-{50-950}      — Error/danger states
  --color-surface-{0-900}     — Background surfaces (light/dark adaptive)
  --color-text-{primary, secondary, muted, disabled}
  --color-border-{default, strong, focus}

Tenant Theming Tokens (white-label support):
  --color-brand-primary       — Overridable per tenant
  --color-brand-secondary     — Overridable per tenant
  --color-brand-accent        — Overridable per tenant
```

**Spacing Scale:** `4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128` (px, mapped to Tailwind spacing)

**Typography Scale:**
| Token | Size | Weight | Line Height | Use |
|:------|:-----|:-------|:------------|:----|
| `display-2xl` | 72px | 700 | 90px | Hero headlines |
| `display-xl` | 60px | 700 | 72px | Page titles |
| `display-lg` | 48px | 600 | 60px | Section headers |
| `heading-xl` | 30px | 600 | 38px | Card titles |
| `heading-lg` | 24px | 600 | 32px | Sub-section headers |
| `body-xl` | 20px | 400 | 30px | Lead paragraphs |
| `body-lg` | 18px | 400 | 28px | Standard body |
| `body-md` | 16px | 400 | 24px | Default body |
| `body-sm` | 14px | 400 | 20px | Secondary text |
| `label-lg` | 14px | 500 | 20px | Form labels |
| `label-sm` | 12px | 500 | 18px | Badges, tags |

### 2.2 Component Library Architecture

The `packages/ui` library is built on **Radix UI primitives** (unstyled, accessible) styled with **Tailwind CSS v4**. All components follow the **Compound Component Pattern** for maximum API flexibility.

**Component Categories:**

| Category | Components |
|:---------|:-----------|
| **Layout** | Container, Grid, Stack, Divider, Section |
| **Navigation** | Navbar, Sidebar, Breadcrumb, Tabs, Pagination |
| **Data Display** | DataTable, Card, Badge, Avatar, Chip, Skeleton |
| **Forms** | Input, Textarea, Select, Combobox, Checkbox, Radio, DatePicker, FileUpload, RichTextEditor |
| **Feedback** | Toast, Alert, Banner, ProgressBar, Spinner, EmptyState, ErrorBoundary |
| **Overlay** | Modal, Drawer, Popover, Tooltip, ContextMenu, CommandPalette |
| **Charts** | LineChart, BarChart, AreaChart, DonutChart, Heatmap, FunnelChart (Recharts wrappers) |
| **AI-Specific** | AIResponseStream, TokenUsageBar, PromptInput, ModelSelector |
| **Marketplace** | ListingCard, ListingGrid, SearchBar, FilterPanel, CategoryTree, PriceRange |

**Component Quality Standards:**
- WCAG 2.1 AA accessibility: keyboard navigation, ARIA roles, contrast ratios
- Tested with Storybook (component documentation + visual regression)
- Unit tested with Vitest + React Testing Library (minimum 80% coverage)
- Performance: no component may cause a layout shift (zero CLS contribution)

---

## 3. Marketplace Storefront (Next.js) Specification

### 3.1 Application Architecture

The Storefront uses the Next.js 15 **App Router** with React Server Components (RSC) as the default rendering pattern. Client Components are used only where interactivity requires it.

**Rendering Decision Matrix:**

| Route | RSC vs CC | Rendering Strategy | Cache Behavior |
|:------|:----------|:-------------------|:---------------|
| `/` (Homepage) | RSC heavy | ISR | `revalidate: 60` (edge) |
| `/feed` (Personalized) | Mixed | SSR (user-specific) | `no-store` (unique per user) |
| `/category/[slug]` | RSC heavy | ISR | `revalidate: 300` |
| `/listing/[id]` | Mixed | ISR + partial CSR | `revalidate: 60`; price via CSR |
| `/search` | RSC + CC (filters) | SSR | `no-store` |
| `/compare` | CC (interactive) | CSR | N/A |
| `/auth/*` | CC | SSR | `no-store, no-cache` |

**Next.js App Router Directory Structure:**
```
app/
  (public)/
    page.tsx                   — Homepage
    category/[slug]/page.tsx   — Category listing page
    listing/[id]/page.tsx      — Listing detail page
    search/page.tsx            — Search results
    feed/page.tsx              — Personalized feed (requires auth)
    compare/page.tsx           — Comparison tool
  (auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
  api/
    analytics/events/route.ts  — Client-side analytics ingestion proxy
    revalidate/route.ts        — On-demand ISR revalidation webhook

components/
  server/                      — React Server Components (no 'use client')
    ListingGrid.tsx
    CategoryNav.tsx
    FeaturedSection.tsx
  client/                      — Client Components ('use client')
    PersonalizedFeed.tsx
    SearchBar.tsx
    FilterPanel.tsx
    RealtimeFeedUpdater.tsx
```

### 3.2 SEO Architecture

The Storefront is the primary SEO surface of the platform. Every page MUST implement:

| SEO Element | Implementation | Requirements |
|:------------|:---------------|:-------------|
| `<title>` | `generateMetadata()` (RSC) | Unique per page; max 60 chars |
| `<meta description>` | `generateMetadata()` | Unique per page; 120-160 chars |
| Open Graph (`og:*`) | `generateMetadata()` | All required OG tags including `og:image` |
| Twitter Card | `generateMetadata()` | `summary_large_image` card type |
| Canonical URL | `generateMetadata()` | Prevent duplicate content |
| Structured Data (JSON-LD) | Inline `<script>` in page | `Product`, `Organization`, `BreadcrumbList` schemas |
| `sitemap.xml` | `app/sitemap.ts` (RSC) | Dynamic generation; all active listings |
| `robots.txt` | `app/robots.ts` | Allow crawl of public pages; disallow `/api/*`, `/feed` |
| Breadcrumbs | `BreadcrumbList` JSON-LD | All category/listing pages |
| `hreflang` | `generateMetadata()` alternates | When i18n is activated |

### 3.3 Core Web Vitals Targets & Enforcement

| Metric | Target | Measurement | Enforcement |
|:-------|:-------|:------------|:------------|
| **LCP** (Largest Contentful Paint) | < 2.5s (75th percentile) | CrUX + Lighthouse CI | Fail CI if Lighthouse LCP > 3.0s |
| **INP** (Interaction to Next Paint) | < 200ms (75th percentile) | CrUX + RUM | Alert if site-wide INP > 200ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 (75th percentile) | CrUX + Lighthouse CI | Fail CI if > 0.15 |
| **TTFB** (Time to First Byte) | < 800ms (75th percentile) | CrUX | Alert if edge cache miss TTFB > 1200ms |
| **FCP** (First Contentful Paint) | < 1.8s | CrUX + Lighthouse CI | Alert if > 2.5s |

**Implementation Constraints Enforcing These Targets:**
- All images MUST use `next/image` with explicit `width`, `height`, `priority` on above-the-fold images.
- Hero LCP images MUST have `priority={true}` and be served via CDN with AVIF/WebP format.
- No render-blocking third-party scripts. Analytics and chat widgets loaded with `strategy="lazyOnload"`.
- Font loading strategy: `display: swap` + `preload` for primary font weight.
- Zero hydration waterfalls: data fetching happens in RSC at the route level, passed as props to Client Components.

### 3.4 Real-Time Feed Integration Architecture

```
CLIENT BROWSER
    │
    ├─ [1] SSR: First 25 feed items rendered (zero layout shift, immediately visible)
    │
    ├─ [2] HYDRATION: React attaches event handlers
    │
    ├─ [3] WEBSOCKET CONNECT: Supabase Realtime subscription on 'tenant_feed:{tenant_id}'
    │
    ├─ [4] INCOMING EVENTS:
    │      - 'feed_item_promoted': Animate new sponsored item into position 3
    │      - 'listing_status_changed': Update listing badge in-place
    │      - 'price_updated': Fade-update price display
    │      - 'new_listings_available': Show "12 new listings — Refresh" banner
    │
    └─ [5] PERSONALIZATION LOOP:
           User click → Analytics event → Kafka → Fast loop preference update
           → Next feed request returns updated results (no explicit page reload)
```

---

## 4. Tenant Dashboard Specification

### 4.1 Application Architecture

The Tenant Dashboard uses Next.js App Router with a hybrid approach: the authenticated shell (sidebar, navbar, session management) uses RSC; all data-heavy modules (tables, charts, forms) use Client Components.

**Route Structure:**
```
app/
  (dashboard)/
    layout.tsx              — Authenticated shell (RSC): checks session, renders sidebar
    page.tsx                — Dashboard overview / analytics summary
    listings/
      page.tsx              — Listing management grid (CSR)
      new/page.tsx          — Listing creation wizard (CSR - multi-step form)
      [id]/edit/page.tsx    — Listing edit (CSR)
    analytics/
      page.tsx              — Analytics canvas: charts, funnels, cohorts
      listings/page.tsx     — Per-listing performance drill-down
    ai/
      page.tsx              — AI usage dashboard: token consumption, costs
      prompts/page.tsx      — Prompt template management
    billing/
      page.tsx              — Billing portal: plan, usage, invoices
      upgrade/page.tsx      — Plan upgrade flow (Stripe Elements)
    settings/
      page.tsx              — Org settings: branding, custom domain
      members/page.tsx      — Team members: invite, roles
      api-keys/page.tsx     — API key management
    moderation/
      page.tsx              — Moderation queue (listings awaiting review)
```

### 4.2 State Management Architecture

| State Category | Solution | Rationale |
|:---------------|:---------|:----------|
| **Server State** (API data) | TanStack Query v5 | Automatic refetch, optimistic updates, cache invalidation, infinite scroll |
| **Global UI State** (sidebar open, theme, active tenant) | Zustand | Lightweight, no boilerplate, persisted to localStorage |
| **Form State** | React Hook Form + Zod | Performant, schema-validated, integrates with TanStack Query mutations |
| **URL State** (filters, sort, pagination) | `nuqs` (searchParams sync) | Browser back/forward navigation; shareable URLs |
| **Realtime State** | Supabase Realtime + TanStack Query invalidation | WebSocket event → `queryClient.invalidateQueries()` |

**TanStack Query Configuration:**
```
Global defaults:
  staleTime:            5 minutes   — Prevents redundant refetches on tab focus
  gcTime:               10 minutes  — Garbage collection window
  retry:                3           — Retry failed requests 3 times with exponential backoff
  refetchOnWindowFocus: true        — Refetch when user returns to tab
  
Key invalidation patterns:
  - Realtime event 'listing_updated'     → invalidate ['listings', id]
  - Realtime event 'listing_quarantined' → invalidate ['listings'], ['moderation-queue']
  - Mutation: update listing status      → optimistic update + invalidate ['listings']
  - Billing plan change                  → invalidate ['billing'], ['ai-quota']
```

### 4.3 Listing Management Grid Specification

The Listing Management Grid is the most-used interface in the platform. Performance requirements are stringent.

| Requirement | Specification |
|:------------|:-------------|
| Row capacity (virtual scroll) | 10,000+ rows without performance degradation |
| Column types | Text, Status badge, Image thumbnail, Price, Date, Actions menu |
| Filtering | Multi-column server-side filtering; debounced search (300ms) |
| Sorting | Single + multi-column server-side sorting |
| Bulk actions | Select all (page / all), bulk status change, bulk delete (soft) |
| Inline editing | Status toggle, price edit without modal |
| Row expansion | Inline analytics preview (impressions, clicks, CTR for 7 days) |
| Column reordering | Drag-and-drop column order persisted to localStorage |
| Export | CSV / XLSX export of filtered result set (async, delivered via email for > 1,000 rows) |

**Technology**: TanStack Table v8 with virtualization via `@tanstack/virtual`.

### 4.4 Analytics Canvas Specification

The Analytics Canvas is a full-page data visualization interface. It must handle the following:

**Panels Required:**

| Panel | Chart Type | Data Source | Refresh |
|:------|:-----------|:------------|:--------|
| KPI Summary Row | Metric cards | Analytics API `/summary` | 5 min |
| Time-Series Performance | Area chart (multi-series) | Analytics API `/summary?granularity=day` | 5 min |
| Conversion Funnel | Funnel chart | Analytics API `/funnel` | 15 min |
| Top Listings Leaderboard | Ranked table | Analytics API `/leaderboard` | 15 min |
| Geo Distribution | Choropleth map | Analytics API `/geo-breakdown` | 1 hour |
| Device Split | Donut chart | Analytics API `/device-breakdown` | 1 hour |
| AI Token Usage | Time-series + cost line | Analytics API `/ai-usage` | 5 min |
| Cohort Retention | Cohort heatmap | Analytics API `/cohort` | 24 hours |

**Global Date Range Picker:**
- Presets: Today, Last 7 days, Last 30 days, Last 90 days, Last 12 months, Custom range
- All panels subscribe to a shared `DateRangeContext` and re-fetch on change
- Date range is persisted to URL params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) for shareable links

---

## 5. Platform Console (Super Admin) Specification

### 5.1 Architecture

The Platform Console is a React 18 SPA built with Vite. It is served from a separate domain (`console.platform.io`) with strict access controls. It uses the same `packages/ui` component library but with an admin-specific theme.

### 5.2 Module Inventory

| Module | Purpose | Key Data Sources |
|:-------|:--------|:-----------------|
| **Global Dashboard** | Platform health overview: active tenants, GMV, AI cost, fraud events | Multiple APIs + Grafana embeds |
| **Tenant Registry** | List, search, filter, inspect all tenants; impersonation (audit-logged) | `/api/v1/admin/tenants` |
| **Moderation Console** | Review quarantined listings; approve/reject with reasoning | `/api/v1/admin/moderation/queue` |
| **Fraud Investigation** | Inspect flagged actors; view behavioral patterns; suspend/unlock | `/api/v1/admin/trust/flags` |
| **AI Governance** | Model registry; prompt registry; global token limits; provider configuration | `/api/v1/admin/ai/*` |
| **Billing Ledger** | Transaction ledger; refund processing; plan overrides | `/api/v1/admin/billing/ledger` |
| **Feature Flags** | Toggle features globally or per tenant; A/B experiment management | `/api/v1/admin/experiments/*` |
| **Audit Log Viewer** | Searchable immutable audit log with export | `/api/v1/admin/audit-logs` |
| **Schema Migrations** | Track applied migrations; initiate rollbacks (with MPA) | `/api/v1/admin/migrations` |

### 5.3 Security Requirements (Console-Specific)

- The Platform Console is NOT accessible from the public internet. It is served behind a VPN/IP allowlist.
- All Console sessions require MFA re-verification at the start of each session.
- All state-modifying actions (approve/reject listing, suspend tenant, process refund) emit an audit log entry and require a `reason` text input from the admin.
- Tenant impersonation is logged with the admin's identity and a 30-minute TTL.

---

## 6. Realtime Client Architecture

### 6.1 Supabase Realtime Abstraction Layer

The `packages/realtime-client` package provides a typed abstraction over Supabase Realtime WebSocket subscriptions. All application code interacts with this package, not directly with the Supabase client.

**Channel Topology:**

| Channel Name | Subscribers | Events | Auth Requirement |
|:-------------|:-----------|:-------|:----------------|
| `feed:{tenant_id}:{user_id}` | Storefront personalized feed | `feed_updated`, `new_listings` | Authenticated user |
| `listing:{listing_id}` | Listing detail page viewers | `price_updated`, `status_changed`, `views_count_updated` | None (public) |
| `dashboard:{tenant_id}` | Tenant Dashboard | `listing_quarantined`, `listing_approved`, `quota_warning`, `new_inquiry` | Tenant member |
| `moderation:{tenant_id}` | Moderation module | `new_item_queued`, `item_reviewed` | Tenant admin |
| `console:global` | Platform Console | `fraud_alert`, `system_alert`, `capacity_warning` | Super admin |
| `billing:{tenant_id}` | Billing portal | `quota_exceeded`, `payment_processed`, `invoice_ready` | Tenant admin |

**Connection Lifecycle:**
1. `RealtimeClient.connect(accessToken)` — Authenticates with Supabase; establishes WebSocket.
2. `RealtimeClient.subscribe(channelName, eventTypes, callback)` — Returns a cleanup function.
3. Client automatically reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s).
4. If reconnection fails after 5 attempts, client falls back to polling mode (30s intervals) and shows "Limited connectivity" UI indicator.
5. On reconnect, client emits a `connection_restored` event; components trigger a TanStack Query refetch to reconcile missed updates.

### 6.2 WebSocket Message Contract

All realtime messages conform to the following schema:

```json
{
  "event_type":      "listing_quarantined",
  "occurred_at":    "2026-05-30T01:45:00.000Z",
  "tenant_id":      "UUID",
  "entity_id":      "UUID",
  "entity_type":    "LISTING",
  "payload": {
    "risk_score":   0.87,
    "reasons":      ["toxicity", "price_anomaly"]
  }
}
```

---

## 7. Performance & Optimization Specification

### 7.1 Bundle Strategy

| Application | Budget (JS, gzipped) | Strategy |
|:------------|:---------------------|:---------|
| Storefront (initial load) | < 150KB | Aggressive RSC; minimal client JS |
| Tenant Dashboard (shell) | < 80KB | Lazy load all dashboard modules |
| Platform Console | < 200KB total | Code split per module; lazy load charts |
| Embedded Widget | < 15KB total | Zero dependencies; web components |

**Implementation Rules:**
- All Recharts instances loaded via `React.lazy()` — never in the initial bundle.
- All modals/drawers loaded via `React.lazy()` with Suspense.
- Third-party SDKs (Stripe Elements, Intercom, etc.) loaded via Next.js `Script` with `strategy="lazyOnload"`.
- Dynamic imports validated in CI: `next build --analyze` report attached to PR for bundle regressions > 10KB.

### 7.2 Caching Strategy

| Layer | Technology | Cache Control |
|:------|:-----------|:-------------|
| Edge CDN (public pages) | Cloudflare | `Cache-Control: public, max-age=60, stale-while-revalidate=300` |
| Next.js Data Cache (RSC fetch) | Built-in | Route-level revalidation tags; on-demand invalidation via webhook |
| TanStack Query (client) | In-memory | `staleTime: 5min`; invalidated by Realtime events |
| Browser Cache (static assets) | HTTP Headers | `Cache-Control: public, max-age=31536000, immutable` (content-hashed filenames) |
| API Response Cache | Redis (edge) | Short-lived for non-personalized endpoints; bypassed for authenticated requests |

### 7.3 Image Optimization Pipeline

All marketplace listing images are processed through an optimization pipeline:

```
UPLOAD: Tenant uploads image (raw JPEG/PNG/HEIC)
    │
    ▼
S3 RAW BUCKET: Original stored (for re-processing)
    │
    ▼
LAMBDA/WORKER: Process on upload event:
    - Validate MIME type + magic bytes (no executable masquerading as image)
    - Strip EXIF metadata (remove GPS, device info)
    - Generate variants:
        thumbnail:  400×300  AVIF + WebP (80% quality)
        card:       800×600  AVIF + WebP (85% quality)
        detail:    1600×1200 AVIF + WebP (90% quality)
        og:        1200×630  JPEG (95% quality) — Open Graph
    │
    ▼
S3 PROCESSED BUCKET → Cloudflare CDN
    │
    ▼
CLIENT: next/image serves correct variant via srcSet:
    <source type="image/avif" srcSet="cdn.platform.io/img/{id}-{w}.avif {w}w" />
    <source type="image/webp" srcSet="cdn.platform.io/img/{id}-{w}.webp {w}w" />
    <img src="cdn.platform.io/img/{id}-800.jpg" alt="..." loading="lazy" />
```

---

## 8. Frontend Observability

### 8.1 Real User Monitoring (RUM)

Core Web Vitals are tracked in real time for all production traffic:

| Metric | Collection Method | Storage | Alert Threshold |
|:-------|:-----------------|:--------|:----------------|
| LCP | `PerformanceObserver('largest-contentful-paint')` | Analytics API | P75 > 3.0s |
| INP | `PerformanceObserver('event')` | Analytics API | P75 > 300ms |
| CLS | `PerformanceObserver('layout-shift')` | Analytics API | P75 > 0.15 |
| TTFB | `PerformanceObserver('navigation')` | Analytics API | P75 > 1500ms |
| JS Errors | `window.onerror` + `unhandledrejection` | Sentry | Any new error signature |
| API Errors | Axios interceptor | Sentry + Analytics | Error rate > 0.5% |
| WebSocket disconnects | Realtime client events | Analytics API | Disconnect rate > 2% |

### 8.2 Error Boundary Architecture

```
<RootErrorBoundary>              — Catches unhandled render errors → Sentry + fallback UI
    <DashboardLayout>
        <ModuleErrorBoundary>    — Per-module boundary → shows "Module unavailable" in-place
            <ListingsModule>
                <QueryErrorBoundary>  — Per-query boundary → inline error + retry button
                    <DataTable>
```

Every error boundary:
1. Logs to Sentry with full component stack trace.
2. Passes `trace_id` (from OTel context) to Sentry for correlation with backend traces.
3. Displays a user-friendly error state with a retry mechanism.
4. NEVER shows raw error messages, stack traces, or internal implementation details to end users.

### 8.3 Feature Flag Integration (Frontend)

Feature flags are fetched server-side (RSC) at the layout level, preventing layout shift or "flicker" of feature-toggled components:

```
Next.js Layout (RSC):
  const flags = await getFeatureFlags(tenantId, userId)
  // Flags fetched from: POST /api/v1/experiments/evaluate
  // Cached with unstable_cache (30s revalidation)
  
  return (
    <FeatureFlagProvider flags={flags}>
      {children}
    </FeatureFlagProvider>
  )

Component usage:
  const { isEnabled } = useFeatureFlag('new_discovery_feed_v2')
  if (!isEnabled) return <OldFeedComponent />
  return <NewDiscoveryFeedV2 />
```
