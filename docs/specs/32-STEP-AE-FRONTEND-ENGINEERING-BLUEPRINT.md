# SPEC 32 — FRONTEND ENGINEERING BLUEPRINT
## AI-Adaptive Marketplace Operating System

> **Status**: Sealed — Engineering-Ready
> **Version**: 1.0.0
> **Date**: 2026-05-31
> **Applies To**: Frontend engineering teams, UI/UX teams, and AI coding agents
> **Basis**: Specs 01–31, Database Master Design (Spec 22), Master Feature Inventory (Spec 21), Complete Engineering Constitution (Spec 30)
> **Stack**: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Shadcn UI · Supabase Client · TanStack Query v5 · Zustand · React Hook Form · Zod

---

## SECTION 1 — FRONTEND ARCHITECTURE

The frontend is engineered as a high-performance, accessible, and reactive entry point to the AI-Native Multi-Tenant Marketplace Operating System. It functions as a dynamic interface that adapts based on user roles, domains, and AI-predicted user intents.

```
                  ┌──────────────────────────────────────────────┐
                  │                 CLIENT SHELL                 │
                  │   Next.js App Router (React Server/Client)   │
                  └──────┬────────────────────────────────┬──────┘
                         │                                │
        ┌────────────────▼───────────────┐        ┌───────▼────────────────┐
        │        DATA INTERFACE          │        │      STATE ENGINE      │
        │  Supabase Client (Direct CRUD) │        │  Zustand (Global/Sync) │
        │  TanStack Query (Async Cache)  │        │  URL (Search & Filters)│
        │  BFF API Routes (Orchestration)│        │  Context (Local View)  │
        └────────────────┬───────────────┘        └───────┬────────────────┘
                         │                                │
                         └────────────────┬───────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │                VIEW PLATFORM                 │
                  │   Core Components · Domain Modules · Atoms   │
                  └──────────────────────────────────────────────┘
```

### 1.1 Architectural Paradigms

1. **Domain-Driven Directory Isolation**: Application features are grouped into domain-bounded modules (`features/` directory). Core, cross-cutting logic lives in shared components (`components/`) and global primitives.
2. **Context-Rich Multi-Tenancy**: The client determines tenant scope dynamically via subdomains (e.g., `tenant-a.marketplace.com`) or path prefixes. Edge middleware extracts organizational brand colors, settings, and feature flags, making layouts highly dynamic and tenant-specific.
3. **Optimistic-First UI**: All user interactions (e.g., saving a search, marking as favorite, modifying draft listings) use optimistic updates via TanStack Query to achieve instant visual feedback under poor latency conditions.

### 1.2 Rendering Decision Matrix

To achieve sub-100ms Core Web Vitals (INP/LCP), rendering is split according to data velocity and authorization requirements:

| Route Type | Route Example | Rendering Strategy | Caching & Revalidation |
|:---|:---|:---|:---|
| **Public Landing Page** | `/` | **ISR (Incremental Static Regeneration)** | Revalidate every 1 hour (`revalidate = 3600`) |
| **Listing Directory** | `/search`, `/real-estate` | **Hybrid (SSR + Client Fetching)** | SSR for base HTML skeleton + dynamic client-side filtering |
| **Listing Details** | `/listings/[id]` | **ISR / Dynamic Hybrid** | ISR by default; on-demand revalidation on update webhook |
| **User/Vendor/Admin Dashboard**| `/dashboard/*`, `/vendor/*` | **CSR (Client-Side Rendering)** | Explicit dynamic rendering (`dynamic = 'force-dynamic'`), authenticated session guard |
| **Public Profiles** | `/vendors/[slug]` | **ISR** | Revalidate every 10 minutes |
| **SEO Asset Pages** | `/blog`, `/legal` | **SSG (Static Site Generation)** | Build-time compilation |

---

## SECTION 2 — APPLICATION STRUCTURE

The workspace follows a highly decoupled, strict directory schema to allow parallel development across feature teams and compatibility with AI coding agents.

```
pr1/
├── app/                              # Next.js App Router (Routing, Layouts, Pages)
│   ├── (auth)/                       # Authentication routing group
│   ├── (dashboard)/                  # User authenticated dashboard group
│   ├── (vendor)/                     # Vendor/Seller dashboard group
│   ├── (admin)/                      # Tenant administrator control plane
│   ├── (public)/                     # Public marketplace, landing, search, profiles
│   ├── api/                          # Next.js API Routes (BFF orchestrator endpoints)
│   ├── layout.tsx                    # Global HTML Shell & Provider Tree
│   └── page.tsx                      # Root domain redirector
├── components/                       # Bounded, domain-agnostic UI building blocks
│   ├── ui/                           # Shadcn primitives (atoms)
│   ├── shared/                       # App-wide structural layout blocks (molecules/organisms)
│   └── providers/                    # React Context providers (Query, Auth, Themes)
├── features/                         # Domain Bounded Contexts (Decoupled Feature Modules)
│   ├── real-estate/                  # Real Estate module-specific views, forms, queries
│   ├── products/                     # Product inventory e-commerce modules
│   ├── services/                     # Service listing, calendars, schedules modules
│   ├── offers/                       # Offer submission & dynamic bid modules
│   ├── discovery/                    # Smart feeds, similarity search, recommendation UI
│   ├── crm/                          # Vendor Lead & Customer Relationships modules
│   └── trust-safety/                 # Content moderation & verification workflows
├── hooks/                            # Shared, domain-agnostic custom React hooks
├── services/                         # Business clients (Stripe, OpenAI, Analytics SDK)
├── repositories/                     # Supabase database access layers (Domain CRUD decoupling)
├── stores/                           # Zustand stores (Global state slices)
├── types/                            # Application-wide TypeScript types & interfaces
├── validators/                       # Zod schema schemas (shared validation laws)
├── lib/                              # Utility helpers (formatting, class mergers, crypto)
├── config/                           # Application environmental constants
└── styles/                           # Tailwinds configurations, global CSS, design tokens
```

---

## SECTION 3 — ROUTING ARCHITECTURE

```
                                  [Root Middleware]
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
          (Public Route)          (Auth Protected)        (Role Protected)
          - Home (/)              - User Dashboard        - Vendor Dashboard
          - Search (/search)      - Favorites             - Leads (/vendor/leads)
          - Profiles (/vendors)   - Profile (/profile)    - Moderation (/admin)
```

### 3.1 Route Taxonomy

#### Public Routes
* `/` - Personalized home page, hero discovery banner, dynamic recommendation grids.
* `/search` - Multi-domain faceted discovery engine. Support URL-driven filters.
* `/listings/[id]` - Canonical details page with hybrid modules (Real Estate details, Product details).
* `/vendors/[slug]` - Public store/profile for independent vendors/brokers.
* `/agencies/[slug]` - Agency profiles showing associated broker rosters.

#### Authenticated Routes (User Space)
* `/dashboard` - User activities, order statuses, communication hub.
* `/favorites` - Real-time saved listings, saved searches with alert threshold toggles.
* `/notifications` - Real-time client alerts feed.
* `/profile/settings` - Secure account customization (KYC progress, Multi-Factor toggles).

#### Vendor Routes (Seller Space)
* `/vendor` - Vendor health overview, active listings list, quick action widgets.
* `/vendor/listings/new` - Multi-step listing composition wizard.
* `/vendor/leads` - Lead interaction grid (buyer details, inquiry pipelines).
* `/vendor/analytics` - Monetization graphs, clickstream logs, impressions dashboard.

#### Administrative Routes (Control Space)
* `/admin/moderation` - Moderation queue, report triggers, media quarantine panels.
* `/admin/users` - Tenant user management, subscription overrides.
* `/admin/settings` - Organization colors, branding variables, custom fields.

---

## SECTION 4 — AUTHENTICATION & SECURITY UI

All identity flows utilize Supabase GoTrue authentication wrapped inside Next.js middlewares and custom React Context hooks.

```
[Login Screen] ──► [GoTrue SDK Auth] ──► [JWT Cookie Set] ──► [Next.js Middleware]
                                                                     │
                                ┌────────────────────────────────────┴────────────────────────────────────┐
                                ▼ (Valid Tenant Claims?)                                                  ▼ (Missing Claims?)
                      [Redirect to Intended Route]                                              [Force /auth/tenant-select]
```

### 4.1 Flows & State Machines

1. **Passwordless / Magic Link Flow**: Input email → Submit → Display Check-Inbox modal with dynamic SVG loading rings → Callback validation page handles raw hashes.
2. **Multi-Factor Authenticator (MFA) Verification UI**: Enforces step-up authentication during access to billing or moderation panels. Renders secondary security challenge cards with automated focus shifts between OTP boxes.
3. **Session Refresh and Invalidation**: A silent token refresher operates in the background, listening to GoTrue events (`onAuthStateChange`). It automatically displays an interactive "Session Expiring" warning banner 60 seconds before expiration.

### 4.2 Auth guards & Next.js Middleware (`/middleware.ts`)

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const url = req.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/auth')
  const isDashboardRoute = url.pathname.startsWith('/dashboard')
  const isVendorRoute = url.pathname.startsWith('/vendor')
  const isAdminRoute = url.pathname.startsWith('/admin')

  // Rule 1: Redirect unauthenticated requests to login
  if (!session && (isDashboardRoute || isVendorRoute || isAdminRoute)) {
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Rule 2: Enforce vendor credentials
  if (session && isVendorRoute && session.user.app_metadata.role !== 'vendor') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Rule 3: Enforce administrative authorization
  if (session && isAdminRoute && !['admin', 'super_admin'].includes(session.user.app_metadata.role)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}
```

---

## SECTION 5 — LAYOUT SYSTEM

Application viewports are structured around a responsive nesting grid using semantic HTML5 tags:

### 5.1 Layout Tree

* **Public Layout (`app/(public)/layout.tsx`)**: Global Header with search bar, footer, and a responsive container. Responsive from Mobile (stacked, sheet-based navigations) to Desktop (wide grids).
* **Vendor Layout (`app/(vendor)/layout.tsx`)**: Permanent collateral collapsible sidebar navigation panel, collapsible global metric bars, sticky top action controls header.
* **Admin Layout (`app/(admin)/layout.tsx`)**: Red-bordered indicator bar at the top, secure shell interface, permanent high-density monitoring metrics footer.

```
┌────────────────────────────────────────────────────────┐
│                        HEADER                          │
├──────────────┬─────────────────────────────────────────┤
│              │                                         │
│   COLLAPSIBLE│               MAIN WORKSPACE            │
│   SIDEBAR    │               (Dashboard Canvas)        │
│   NAV        │                                         │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

---

## SECTION 6 — DESIGN SYSTEM (CSS VARIABLES & TOKENS)

The styling architecture uses Tailwind CSS v4 using dynamic CSS custom properties for instant tenant brand themes injection.

### 6.1 Theme Definition

```css
@theme {
  --color-background: var(--bg-canvas);
  --color-foreground: var(--text-base);

  --color-primary: var(--tenant-primary);
  --color-primary-foreground: var(--tenant-primary-contrast);

  --color-muted: var(--border-neutral);
  --color-destructive: var(--alert-error);
  
  --font-sans: 'Outfit', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
  --animate-shimmer: shimmer 2s infinite linear;
}
```

### 6.2 Base Color Tokens

```css
:root {
  /* Dynamic values initialized by tenant configuration */
  --tenant-primary: #6366f1;
  --tenant-primary-contrast: #ffffff;

  /* Global variables */
  --bg-canvas: #fafafa;
  --bg-surface: #ffffff;
  
  --text-base: #18181b;
  --text-muted: #71717a;
  
  --border-neutral: #e4e4e7;
  --alert-error: #ef4444;
  --alert-warning: #f59e0b;
  --alert-success: #10b981;

  --radius-factor: 0.5rem;
}

.dark {
  --bg-canvas: #09090b;
  --bg-surface: #18181b;
  --text-base: #fafafa;
  --text-muted: #a1a1aa;
  --border-neutral: #27272a;
}
```

---

## SECTION 7 — COMPONENT LIBRARY

The workspace inventory consists of three design tiers:

```
                  ┌──────────────────────────────────────────────┐
                  │                   ATOMS                      │
                  │   - Button  - Input  - Badge  - Switch       │
                  └──────┬────────────────────────────────┬──────┘
                         │                                │
                         ▼                                ▼
                  ┌──────────────────────────────────────────────┐
                  │                 MOLECULES                    │
                  │   - SearchBar  - FilterCard  - ImageGallery  │
                  └──────┬────────────────────────────────┬──────┘
                         │                                │
                         ▼                                ▼
                  ┌──────────────────────────────────────────────┐
                  │                 ORGANISMS                    │
                  │   - ListingGrid  - AnalyticsCanvas - Chat    │
                  └──────────────────────────────────────────────┘
```

### 7.1 Atoms
* `Button`: Renders various brand states (Primary, Secondary, Muted, Destructive) with an inline SVG loading spinner and full keyboard accessibility support.
* `Input`: Floating-label fields featuring absolute error states and dynamic aria attributes hooks.
* `Badge`: Clean labels mapping system categories, status identifiers, and risk indicators.

### 7.2 Molecules
* `SearchBar`: Adaptive input integrating search-history dropdowns, neural suggestions, and instant tag clears.
* `FilterCard`: Collapsible sidebar block displaying ranges, dynamic categories check lists, and geo-range sliders.

### 7.3 Organisms
* `ListingGrid`: Virtualized infinite scroll grid using `@tanstack/react-virtual` for stable 10,000+ listings renders on standard mobile devices.
* `AnalyticsCanvas`: Layout rendering drag-and-drop dashboard charts and telemetry summaries.

---

## SECTION 8 — FORMS ARCHITECTURE

```
[Form Entry] ──► [Zod Validation] ──► [React Hook Form Engine]
                          │
         ┌────────────────┴────────────────┐
         ▼ (Validation Fails)              ▼ (Validation Passes)
   [Focus Focus-Ref + Screen Reader]   [Atomic Auto-Save Draft to Storage]
```

### 8.1 multi-Step Wizard State machine

To capture listing inventory (e.g., complex Real Estate coordinates or service catalogs), forms utilize segmented UI pipelines.

1. **Local State Buffering**: Users can navigate through wizard panels (e.g., Step 1: Base Specs, Step 2: Location/Geo, Step 3: Media Upload) with progress states serialized in the URL (e.g., `?step=2`).
2. **Automatic Drafting**: Form state auto-saves to LocalStorage using a hook with debounced sync to `outbox.drafts` via Supabase Edge Functions.
3. **Resilient Chunked Media Uploader**: Files are split into 5MB chunks and uploaded to Supabase Storage with dynamic progress bars, retry state configurations, and automatic cancellation tokens.

---

## SECTION 9 — DATA ACCESS & REPOSITORY LAYER

Frontend data interactions do not fetch directly from API endpoints. Instead, they interact with decoupled repository models mapped through custom TanStack Query hooks.

```
┌──────────────────────────────────────────────┐
│                  VIEW LAYER                  │
│           (React hooks & selectors)          │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│           QUERY / CACHE CONTROLLER           │
│        (TanStack Query Cache Layer)          │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│             REPOSITORY SERVICE               │
│        (Supabase Typed Client Class)         │
└──────────────────────────────────────────────┘
```

### 9.1 Data Access Matrix

```typescript
// repositories/listing.repository.ts
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type Listing = Database['marketplace']['Tables']['listings']['Row']

export const ListingRepository = {
  async getById(id: string): Promise<Listing> {
    const { data, error } = await supabase
      .schema('marketplace')
      .from('listings')
      .select('*, media:listing_media(*)')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async update(id: string, updates: Partial<Listing>): Promise<Listing> {
    const { data, error } = await supabase
      .schema('marketplace')
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}
```

### 9.2 Optimistic Mutation Blueprint

```typescript
// hooks/use-favorite-listing.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export function useFavoriteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, isFav }: { listingId: string; isFav: boolean }) => {
      if (isFav) {
        await supabase.schema('marketplace').from('favorites').insert({ listing_id: listingId })
      } else {
        await supabase.schema('marketplace').from('favorites').delete().eq('listing_id', listingId)
      }
    },
    onMutate: async ({ listingId, isFav }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] })
      const previousFavorites = queryClient.getQueryData(['favorites'])

      queryClient.setQueryData(['favorites'], (old: any) => {
        return isFav ? [...old, { listing_id: listingId }] : old.filter((item: any) => item.listing_id !== listingId)
      })

      return { previousFavorites }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['favorites'], context?.previousFavorites)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    }
  })
}
```

---

## SECTION 10 — STATE MANAGEMENT ARCHITECTURE

The application implements three primary state tiers:

```
┌────────────────────────────────────────────────────────┐
│                   PERSISTENT URL STATE                 │
│  - Search filters, Active Listing viewports, Tab state │
├────────────────────────────────────────────────────────┤
│                    GLOBAL ZUSTAND STORE                │
│  - Active auth session, Cart configurations, Alerts    │
├────────────────────────────────────────────────────────┤
│                    TANSTACK ASYNC CACHE                │
│  - Database query cache, Server-validated flags        │
└────────────────────────────────────────────────────────┘
```

1. **URL State (Single Source of Truth for Search)**: Search terms, locations, sorting rules, and filter flags persist in the URL query string (`/search?q=lakefront&beds=3&sort=price_asc`). This architecture makes all discovery pages shareable.
2. **Global Zustand Stores**: Highly focused slices (e.g., `useSessionStore`, `useNotificationStore`) store transient UI states.
3. **TanStack Query (Async Server State)**: Handles server-state caching, automatic revalidation when the window regains focus, and garbage collection of unused query results.

---

## SECTION 11 — SEARCH EXPERIENCE & INTERACTIVE UX

The search platform is a highly interactive, lightning-fast component designed for continuous discovery.

```
 [User Types in Search Box]
            │
            ├─► Debounced (150ms) ──► Query Autocomplete API ──► Render Quick Suggestions Dropdown
            │
            └─► Hits Enter ─────────► Push to URL Router `/search?q=...`
                                                 │
                                                 ▼
                                     [Dynamic Search Panel]
                                     ├── Left: Faceted Filter Panel (Instant Trigger on Toggle)
                                     ├── Center: Virtualized Listing Grid (Sub-100ms LCP)
                                     └── Right: Mapbox Coordinate Cluster Grid
```

* **Instant Filter Application**: Toggling a filter card checkbox updates the URL immediately using Next.js router transitions with `shallow = true` where possible, preventing unnecessary page redraws.
* **Vector Auto-Suggestions**: When focusing the search bar, the UI retrieves historical queries and displays context-aware AI search recommendations (e.g., "Real estate near you with a pool").

---

## SECTION 12 — REALTIME UX & WEBSOCKET TOPOLOGY

All dynamic UI layers interact with Supabase Realtime channels to sync state without requiring full page reloads.

```
                         Supabase Realtime Bus
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼ (CDC Broadcast)         ▼ (Presence Broadcast)    ▼ (CDC Broadcast)
   [Live Notifications]      [Active Co-Browsing Users]   [Inventory State Sync]
```

### 12.1 Realtime Integration Interfaces

* **Realtime Chat Platform**: Subscribes to the broadcast channel (`realtime:rooms:[room_id]`). Messages are appended to local Zustand stores instantly, triggering smooth scroll-to-bottom actions.
* **Inventory Alerts**: Subscribes to database changes on `marketplace.listings` where `status = 'active'`. Renders a subtle toast alert if a new property matching the user's active search criteria goes live.

---

## SECTION 13 — MARKETPLACE EXPERIENCES & DETAIL PAGES

Each inventory type (Real Estate, Products, Services, Offers) renders specialized UI layouts designed to optimize conversion rates:

* **Real Estate Details**: Renders architectural metadata blocks (beds, baths, square footage), integrated Mapbox location maps, and interactive mortgage calculator forms.
* **Service Details**: Integrates visual availability calendar modules enabling immediate booking reservation selections.
* **Offer Panel**: Vendor bid sheets showing dynamic pricing scales and message boxes for vendor communications.

```
┌────────────────────────────────────────────────────────┐
│                     MEDIA CAROUSEL                     │
├────────────────────────────┬───────────────────────────┤
│                            │                           │
│     INVENTORY METADATA     │     DYNAMIC CALL-TO-ACTION│
│     (Beds, Baths, SqFt)    │     (Book / Buy / Bid)    │
│                            │                           │
└────────────────────────────┴───────────────────────────┘
```

---

## SECTION 14 — DASHBOARD EXPERIENCES

Authenticated dashboard workspaces are customized to match user roles:

1. **User Dashboard**: High-density view showcasing recent order updates, messages, saved listings changes, and security panels.
2. **Vendor Dashboard**: Complete business platform. Features listing creation pipelines, metric summaries, CRM lead pipelines, and subscription controls.
3. **Super Admin Dashboard**: Global control plane featuring a high-velocity moderation queue, media quarantine visual grids, and global tenant activity graphs.

---

## SECTION 15 — ANALYTICS & TELEMETRY UX

Dashboard monitoring panels are implemented using accessible SVGs powered by `@recharts` or custom components:

```
┌────────────────────────────────────────────────────────┐
│                    DASHBOARD WIDGETS                   │
├────────────────────────────┬───────────────────────────┤
│  [ Monthly Revenue Chart ] │  [ Funnel Analysis Chart] │
│      Hover for Tooltip     │      Interactive Toggles  │
├────────────────────────────┴───────────────────────────┤
│  [ Impression Heatmaps ]                               │
└────────────────────────────────────────────────────────┘
```

* **Funnel Analysis Display**: Visually maps user conversions from listing impression → click → inquiry → transaction.
* **Attribution Graphs**: Clean UI charts showing marketing campaigns effectiveness and lead source channels.
* **Export Tooling**: Client-side triggers enabling asynchronous generation and download of CSV, Excel, or PDF reports.

---

## SECTION 16 — AI-ADAPTIVE EXPERIENCE (COGNITIVE LAYERS)

The application adapts to the user based on their real-time behavior and system signals:

* **Dynamic Home Page Layout**: Hero banners and listing recommendations rearrange dynamically on the client based on user interest profiles stored in local states and synchronized with the backend database.
* **AI-Guided Search Interface**: Natural language input block where users can type complex prompts (e.g., "Find a modern apartment with a balcony under $3,000 in Seattle"). The UI translates the prompt into dynamic search parameters and visually highlights the matching filters in the sidebar.

---

## SECTION 17 — CLIENT-SIDE ERROR RESILIENCY

```
┌────────────────────────────────────────────────────────┐
│                    GLOBAL APPLICATION FRAME            │
│  ┌──────────────────────────────────────────────────┐  │
│  │               SECURE COMPONENT ROUTE             │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │         REACT ERROR BOUNDARY (Local)       │  │  │
│  │  │                                            │  │  │
│  │  │  [ Error Occurred: Render Fail Card ]      │  │  │
│  │  │  [ Trigger Silent Observability Ingest ]   │  │  │
│  │  │  [ Display "Retry Component" CTA ]        │  │  │
│  │  │                                            │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

* **Local Error Boundaries**: Broken components (e.g., a single failing metric widget) are caught by local React error boundaries. Renders a fallback card with a "Retry" button, keeping the rest of the dashboard functional.
* **Realtime Resiliency**: When WebSocket connections drop, the UI shows a subtle status indicator (`Offline — Reconnecting...`) in the status bar and queues actions in an in-memory outbox for execution on recovery.

---

## SECTION 18 — PERFORMANCE ENGINEERING

To achieve excellent Core Web Vitals targets, the frontend strictly enforces the following performance standards:

* **Image Optimization Pipeline**: All media assets use the Next.js `<Image>` component, enforcing explicit dimensions, custom `sizes` attributes, and dynamic modern format transformations (`.webp`, `.avif`).
* **Virtualized Lists**: Long grids (e.g., search results or activity logs) use virtualized windowing to render only the elements currently visible in the viewport.
* **Streaming and Suspense**: Page routes utilize `Suspense` borders to stream heavy interactive blocks (e.g., recommendation carousels) asynchronously, ensuring the main layout is interactive immediately.

---

## SECTION 19 — ACCESSIBILITY (WCAG 2.2 AA CONSTITUTION)

The application prioritizes accessibility to ensure a seamless experience for all users:

* **Keyboard Navigation**: Interactive elements feature distinct focus outlines (`focus-visible:ring-2`), and modal dialogs trap keyboard focus using accessible focus-trap behaviors.
* **ARIA & Screen Readers**: Dynamic UI updates (e.g., loading states or alerts) use explicit ARIA states (`aria-live="polite"`, `aria-busy`). Form inputs are bound to explicit error labels using `aria-describedby`.
* **Contrast Compliance**: Dynamic tenant brand themes are validated programmatically to ensure a minimum contrast ratio of 4.5:1 against their backgrounds.

---

## SECTION 20 — TESTING ARCHITECTURE

The application uses a three-tier automated testing strategy to guarantee regression-free releases:

```
┌────────────────────────────────────────────────────────┐
│                   PLAYWRIGHT (E2E)                     │
│  - Full Multi-Tenant login & Checkout pipelines        │
├────────────────────────────────────────────────────────┤
│                 VITEST / REACT TESTING LIB             │
│  - Interactive components integration & validations     │
├────────────────────────────────────────────────────────┤
│                      UNIT TESTS                        │
│  - Utility functions, Zod schemas, Reducers validation │
└────────────────────────────────────────────────────────┘
```

1. **Unit Testing (Vitest)**: Validates helper functions, formatters, and Zod validation rules.
2. **Component Testing (React Testing Library)**: Tests components in isolation to verify interactive states, keyboard navigation, and ARIA attributes.
3. **E2E Testing (Playwright)**: Runs full browser automation tests across tenant subdomains to verify complex multi-tenant workflows (onboarding, real-time messaging, and billing checkouts).

---

## SECTION 21 — FRONTEND IMPLEMENTATION ROADMAP

```
  Phase 1: Foundation  ──►  Phase 2: Discovery  ──►  Phase 3: Workspaces  ──►  Phase 4: Optimization
  (Component System)        (Search & Detail)       (Dashboards & Forms)      (Performance & E2E)
```

### Phase 1 — Core Foundation & Design System
* **Deliverables**: Global layout structure, Tailwind configuration, dynamic color system, primary components (buttons, input fields, modals), and authentication views.
* **Dependencies**: Approved UI mockup libraries.
* **Risks**: Variations in tenant configurations causing layout shifts.
* **Acceptance Criteria**: All primary atoms pass WCAG 2.2 AA color contrast rules and have full keyboard accessibility.

### Phase 2 — Faceted Discovery & Detail Modules
* **Deliverables**: URL-driven search interface, virtualized infinite scroll grid, and details pages for real estate and product categories.
* **Dependencies**: Supabase Search and Vector Database configuration.
* **Risks**: Layout lag when handling fast filter changes.
* **Acceptance Criteria**: Search page loads and filters apply within a 150ms LCP target.

### Phase 3 — Authenticated Workspaces & Multi-Step Wizards
* **Deliverables**: Nested dashboard layouts, multi-step listing editor with auto-save drafts, CRM lead panels, and messaging interface.
* **Dependencies**: Phase 1 components and Supabase Storage rules.
* **Risks**: Complex state management during dynamic listing updates.
* **Acceptance Criteria**: Form states automatically save draft updates to the local state database.

### Phase 4 — Realtime Monitoring, AI Experiences & Optimizations
* **Deliverables**: Real-time notifications panel, AI search bar integration, performance audit optimizations, and Playwright end-to-end test coverage.
* **Dependencies**: Phase 2 and 3 features.
* **Risks**: Slow loading times on low-end mobile devices due to heavy data tables.
* **Acceptance Criteria**: Production bundles achieve an overall Performance Score of 90+ on Lighthouse audit metrics.
