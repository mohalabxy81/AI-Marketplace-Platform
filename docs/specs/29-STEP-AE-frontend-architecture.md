# 🔥 STEP AE — FRONTEND APPLICATION ARCHITECTURE BLUEPRINT

## 1. FRONTEND PLATFORM MODEL
The platform is a single Next.js 15 monorepo containing three distinct frontend applications, securely isolated via Next.js App Router mechanics:

1. **Public Marketplace App:** Consumer-facing app optimized for discovery, SEO, and lead conversion.
2. **Tenant Company Dashboard:** B2B SaaS dashboard where companies manage their listings, team, and billing.
3. **Super Admin Console:** Internal control plane for platform operators to manage tenants, billing, and moderation.

**Isolation Strategy:**
- **Routing:** Separate root segments `(public)`, `(dashboard)`, `(super-admin)`.
- **Layouts:** Completely separate `layout.tsx` files to prevent UI bleed.
- **State:** Zustand stores are namespaced to avoid mixing tenant state with super admin state.
- **Auth:** Middleware enforces strict route-to-role matching before rendering.

## 2. COMPLETE FOLDER STRUCTURE
```text
app/
├── (public)/                 ← Marketplace App
│   ├── layout.tsx
│   ├── page.tsx              ← AI Home Feed
│   ├── search/
│   ├── listings/[slug]/
│   └── profile/
├── (dashboard)/              ← Tenant Dashboard
│   ├── layout.tsx            ← Injects Tenant Context
│   ├── page.tsx              ← Company Analytics
│   ├── listings/
│   ├── team/
│   ├── inbox/
│   └── billing/
├── (super-admin)/            ← Platform Admin
│   ├── layout.tsx            ← Enforces Super Admin Role
│   ├── page.tsx              ← Global KPIs
│   ├── tenants/
│   ├── users/
│   ├── billing/
│   └── moderation/
├── (auth)/                   ← Shared Auth Flows
│   ├── login/
│   ├── register/
│   └── reset-password/
└── api/                      ← Next.js Route Handlers
    ├── webhooks/stripe/
    └── ai/

features/                     ← Domain-Driven Code
├── marketplace/              ← Shared marketplace logic
├── tenant/                   ← B2B specific logic
├── super-admin/              ← Admin specific logic
├── ai/                       ← AI insight & recommendation hooks
├── billing/                  ← Payment & Quota components
├── analytics/                ← Charts & Metrics
├── moderation/               ← Trust & Safety tools
└── platform-core/            ← Base layout components
```

## 3. ROUTING & MIDDLEWARE ARCHITECTURE
**Middleware Flow:**
1. Check `supabase.auth.getSession()`.
2. Determine intended route:
   - If `/super-admin/*`: Check if user role is `SUPER_ADMIN`. If not, redirect to `/403`.
   - If `/dashboard/*`: Check if user has an active `organization_id`. If not, redirect to `/onboarding`.
   - If `/(public)/*`: Allow anonymous; if authenticated, enrich session.
3. **Tenant Context Injection:** Pass the resolved `tenant_id` to headers so downstream Server Components can access it without an extra DB hop.

## 4. STATE MANAGEMENT ARCHITECTURE
Using Zustand for global client state and TanStack Query v5 for server state.

**Zustand Stores:**
- `useAuthStore`: Syncs with Supabase Auth (`user`, `session`, `role`).
- `useTenantStore`: Holds the active `company_id`, brand colors, and quota warnings.
- `useUiStore`: Sidebar toggle, global modals, theme preference.

**TanStack Query Architecture:**
- **Query Key Factory:** Strict typing (e.g., `['tenant', tenantId, 'listings']`).
- **Invalidation:** `queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })` clears all tenant data on plan upgrade.
- **Optimistic Updates:** Immediate UI feedback for listing status toggles, rolled back on mutation error.

## 5. SUPER ADMIN CONSOLE ARCHITECTURE
A powerful, secure workspace for platform operators.
- **Tenant Management:** Search, view full details, suspend, or reactivate.
- **Impersonation:** Secure "Login As" feature to debug tenant issues (requires strict audit logging and UI indicators).
- **Billing Management:** View Stripe sync status, override subscriptions, grant promotional credits.
- **Moderation Center:** Live queues for flagged listings/users, integrated with the Trust & Safety API.
- **System Health:** Vercel/Supabase health metrics, active feature flags.

## 6. PUBLIC MARKETPLACE APP ARCHITECTURE
Built for speed, conversion, and personalization.
- **AI-Powered Feed:** Replaces static sorting with an embedding-based recommendation grid.
- **Semantic Search:** Natural language input ("apartments near good schools") mapped to vector queries.
- **Listing Detail Page (LDP):** Highly optimized Server Component. Renders core info statically; streams in dynamic AI insights and live availability via Suspense.

## 7. SHARED COMPONENT LIBRARY ARCHITECTURE
Built on `shadcn/ui` and `TailwindCSS v4`.
- **Layout:** `PageContainer`, `SidebarNavigation`, `TopBar`.
- **Data Display:** `DataTable` (generic, sortable), `StatCard`, `TrendIndicator`.
- **Forms:** Controlled via `react-hook-form` and validated by `Zod`.
- **AI Specific:** `AIInsightCard` (with sparkle icon and explainability tooltip), `SemanticSearchBar`.

## 8. AI UX ARCHITECTURE
- **Explainability:** AI recommendations always include a "Why you are seeing this" tooltip to build user trust.
- **Graceful Degradation:** If the OpenAI API times out, the UI falls back to standard chronological sorting without breaking the page.
- **Loading States:** Uses "shimmer" effects specific to text blocks while AI generates insights, rather than blocking spinners.

## 9. REALTIME UX ARCHITECTURE
- **Supabase Realtime:** Subscribed to `platform_events` and `messages`.
- **Notifications:** Bell icon with live unread count.
- **Presence:** "3 other people are viewing this listing right now" banner on LDPs.
- **Dashboard:** Revenue and traffic charts auto-refresh without page reloads.

## 10. PERFORMANCE ARCHITECTURE
- **Server Components (RSC):** Default for all pages. Only interactive leaves (forms, charts, maps) are `use client`.
- **Image Optimization:** `next/image` with strict sizing and `webp`/`avif` formats for heavy listing media.
- **Prefetching:** TanStack Query `prefetchQuery` triggers on link hover.
- **Edge Caching:** Static marketplace pages cached at the CDN edge, revalidated on webhooks.

## 11. DESIGN SYSTEM ARCHITECTURE
- **Semantic Tokens:** `bg-background`, `text-primary`. Avoiding hardcoded hex values to support perfect Dark Mode.
- **Typography:** Custom font (e.g., Inter or Geist) optimized with `next/font`.
- **Animations:** Framer Motion used sparingly for micro-interactions (modal pops, success checkmarks), honoring `prefers-reduced-motion`.

## 12. MULTI-TENANT BRANDING ARCHITECTURE
- **CSS Variables:** The `TenantProvider` reads the `brand_color` from the database and dynamically sets `--primary` in the inline style of the root layout, instantly applying the tenant's brand to all `shadcn` components.

## 13. ERROR & LOADING STATE ARCHITECTURE
- **Route Errors:** `error.tsx` catches rendering failures, offering a "Try Again" boundary.
- **Not Found:** `not-found.tsx` for 404s (e.g., deleted listings).
- **Skeletons:** `loading.tsx` provides exact structural match to the destination page to prevent layout shift.

## 14. TESTING ARCHITECTURE
- **Unit/Component:** `Vitest` + `React Testing Library`.
- **E2E:** `Playwright` testing critical paths (Login → Create Listing → Checkout).
- **Visual Regression:** Percy or Chromatic for core design system components.

## 15. FRONTEND IMPLEMENTATION ROADMAP
- **FE1: Foundation:** Next.js setup, Tailwind v4, shadcn init, Zustand stores, Auth flows.
- **FE2: Company Dashboard:** Layouts, CRUD for listings, basic team settings.
- **FE3: Super Admin Console:** Impersonation flows, user tables, moderation queues.
- **FE4: Public Marketplace:** LDPs, SEO setup, static search grid.
- **FE5: AI UX Layer:** Semantic search bar, recommendation widgets.
- **FE6: Realtime Layer:** Chat UI, live notification bell.
- **FE7: Billing UX:** Upgrade modals, pricing tables, quota progress bars.
- **FE8: Polish:** Framer animations, accessibility audits, Playwright tests.
