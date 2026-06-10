# MASTER FIX & COMPLETE PROMPT
## AI-Native Marketplace Operating System — Full Build Continuation

---

> **How to use this document:** Each section below is a standalone prompt you paste into your AI assistant (Gemini, Claude, ChatGPT, etc.). Run them in order. Never skip a step — each one depends on the previous output.

---

## ⚠️ AUDIT FINDINGS SUMMARY

Before running any prompt, understand what exists and what is missing:

**What is actually built (code):**
- Next.js 15 Company Dashboard with mock data
- Basic Supabase schema: `001_initial_schema.sql` (users, companies, listings, basic tables)
- Authentication layer (Supabase Auth + middleware)
- Deployment docs: DEPLOYMENT.md, ARCHITECTURE.md, SECURITY.md

**What exists as prompts/architecture docs only (NO code):**
- STEP 1–4: Super Admin, Platform Core, Marketplace Intelligence, AI Infrastructure
- Master Platform Blueprint (consolidation)
- STEP X: Technical Specifications + Feature Map
- STEP Z: Product Requirements Master Package (24 PRDs)
- STEP AA: Database Master Design
- STEP AB: Supabase Production Blueprint
- STEP AC: Event Contract Catalog
- STEP AD: Backend Architecture (16 sections)

**What is completely missing (neither prompt nor code):**
- STEP 5: Monetization & Growth Intelligence prompt
- STEP 6: Trust & Safety Infrastructure prompt
- STEP 7–10: Scale, Production Engineering, Execution Phases, Launch Strategy
- STEP AE: Frontend Application Architecture prompt
- ALL implementation code: Super Admin UI, SQL migrations (15+ domains), Edge Functions, AI layer, Billing/Stripe, Realtime, Analytics, Marketplace client

---

## STEP 5 — MONETIZATION & GROWTH INTELLIGENCE ARCHITECTURE

```
You are a world-class Principal Monetization Architect, Revenue Systems Engineer, Growth Intelligence Architect, Marketplace Monetization Strategist, and AI-Native Billing Infrastructure Designer.

You are continuing development of an EXISTING AI-Native Multi-Tenant Marketplace Operating System.

IMPORTANT:
- DO NOT redesign previous architecture
- DO NOT generate implementation code
- DO NOT generate database schemas or SQL
- CONTINUE from: Master Platform Blueprint, PRD Bible (STEP Z), Database Master Design (STEP AA), Supabase Blueprint (STEP AB)

====================================================
CONTEXT
====================================================

The platform is an AI-Native Marketplace Operating System combining:
- Marketplace Infrastructure
- AI Personalization Infrastructure
- Multi-Tenant SaaS Infrastructure
- Discovery & Recommendation Engine
- Trust & Moderation Infrastructure

Architecture: Hybrid Modular Monolith (Next.js 15 + Supabase + PostgreSQL + pgvector + Edge Functions)

This is NOT a simple Stripe integration task.
This is: Revenue Operating Infrastructure Architecture.

====================================================
OBJECTIVE
====================================================

Generate the COMPLETE:
🔥 MONETIZATION & GROWTH INTELLIGENCE ARCHITECTURE

====================================================
REQUIRED OUTPUT
====================================================

# 1. MONETIZATION PHILOSOPHY
Define the platform's revenue operating model.
Explain why monetization is infrastructure, not a feature.
Define monetization layers: subscription, usage, marketplace, AI, sponsored.

# 2. SUBSCRIPTION ENGINE ARCHITECTURE
Design:
- Plan tiers: FREE / PRO / ENTERPRISE
- Feature entitlements per plan
- Subscription lifecycle: created → active → past_due → cancelled → reactivated
- Grace periods and dunning
- Tenant-aware plan enforcement
- Mid-cycle upgrades/downgrades

# 3. USAGE BILLING ENGINE
Design:
- API call metering
- AI inference metering
- Storage metering
- Listing slot metering
- Team seat metering
- Quota enforcement at request time
- Overage handling

# 4. AI COST vs REVENUE INTELLIGENCE
Design a system that tracks:
- Cost per AI inference per tenant
- Cost per embedding refresh
- Cost per recommendation served
- Revenue generated per AI action
- AI ROI per tenant
- AI cost optimization signals

# 5. MARKETPLACE MONETIZATION ENGINE
Design:
- Featured listings: visibility boosts in feed
- Sponsored discovery: paid placement in AI-ranked feeds
- Promotion campaigns: time-limited boosts with budget caps
- Premium category placement
- AI-powered boost optimization (maximize ROI for tenants)
- Click and impression tracking for sponsored content

# 6. STRIPE INTEGRATION ARCHITECTURE
Design:
- Stripe Customer → Tenant mapping
- Stripe Subscription → Plan mapping
- Stripe Usage Records → Metering pipeline
- Webhook handling: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- Idempotency strategy for webhook processing
- Failure recovery and retry logic
- Stripe Connect readiness (for future marketplace revenue sharing)

# 7. QUOTA ENFORCEMENT ARCHITECTURE
Design:
- Real-time quota checking at API gateway level
- Quota tables: listings_quota, ai_calls_quota, team_seats_quota, storage_quota
- Enforcement mode: soft_limit (warn), hard_limit (block), grace_period
- Quota reset cycles: monthly, rolling 30-day
- Quota upgrade prompts at 80% / 95% / 100%

# 8. GROWTH INTELLIGENCE LAYER
Design:
- Retention prediction model: signals that predict churn 30 days out
- Upsell intelligence: tenant behavior patterns that predict upgrade readiness
- Churn detection: engagement drop signals, quota underuse patterns
- Conversion intelligence: trial-to-paid conversion scoring
- Tenant health score: composite metric combining activity, quota usage, engagement

# 9. MONETIZATION ANALYTICS
Design:
- MRR / ARR tracking
- LTV per tenant cohort
- CAC by acquisition channel
- Churn rate by plan tier
- AI cost per dollar of revenue
- Sponsored listing ROI analytics
- Revenue attribution model

# 10. MONETIZATION EVENTS
Define the complete monetization event taxonomy:
- subscription_created / upgraded / downgraded / cancelled / reactivated
- invoice_created / paid / failed / forgiven
- quota_consumed / quota_warned / quota_exceeded / quota_reset
- boost_created / boost_expired / boost_impression / boost_click
- sponsored_listing_created / sponsored_impression / sponsored_click / sponsored_converted
- trial_started / trial_converted / trial_expired
- upsell_triggered / upsell_accepted / upsell_declined

For each event define: producer, consumers, payload schema, retention policy.

# 11. ENTITLEMENT ENFORCEMENT MODEL
Design:
- Feature flag + plan entitlement matrix
- Entitlement check at API request time
- Entitlement cache strategy (avoid DB hit on every request)
- Entitlement invalidation on plan change
- Admin override entitlements

# 12. ADAPTIVE PRICING READINESS
Design future-ready hooks for:
- Usage-aware pricing (price per unit scales with volume)
- Behavioral pricing signals (high-value tenants get proactive offers)
- AI-optimized pricing experiments

# 13. MONETIZATION DOMAIN SERVICE BOUNDARIES
Define:
- What lives in the billing domain
- What lives in the monetization domain
- What lives in the analytics domain
- Cross-domain event contracts
- Forbidden dependencies

# 14. FAILURE RECOVERY ARCHITECTURE
Design:
- Webhook failure handling (dead letter queue, retry with exponential backoff)
- Payment failure dunning sequence
- Quota enforcement failure (fallback behavior when quota service is down)
- Billing data consistency (idempotency keys, event deduplication)

# 15. MONETIZATION IMPLEMENTATION ROADMAP
Generate phases:
- Phase M1: Core subscription + Stripe integration
- Phase M2: Usage metering + quota enforcement
- Phase M3: Sponsored listings + boost engine
- Phase M4: Growth intelligence + churn prediction
- Phase M5: AI cost optimization + margin analytics

For each phase: deliverables, dependencies, complexity, acceptance criteria.

====================================================
RULES
====================================================
Think like: Principal Monetization Architect at Stripe + Revenue Intelligence Lead at Airbnb + Growth Systems Architect at Spotify.
Output must be enterprise-grade, AI-aware, marketplace-native, multi-tenant safe.
```

---

## STEP 6 — TRUST, SAFETY & FRAUD INFRASTRUCTURE ARCHITECTURE

```
You are a world-class Principal Trust & Safety Architect, Fraud Systems Engineer, Marketplace Integrity Architect, AI-Powered Moderation Systems Designer, and Platform Risk Engineer.

You are continuing development of an EXISTING AI-Native Multi-Tenant Marketplace Operating System.

IMPORTANT:
- DO NOT redesign previous architecture
- DO NOT generate implementation code
- CONTINUE from: Master Platform Blueprint, PRD Bible, Database Master Design, Monetization Architecture

====================================================
OBJECTIVE
====================================================

Generate the COMPLETE:
🔥 TRUST, SAFETY & FRAUD INFRASTRUCTURE ARCHITECTURE

====================================================
REQUIRED OUTPUT
====================================================

# 1. TRUST PHILOSOPHY
Explain why trust is infrastructure, not a feature.
Define trust layers: entity trust, content trust, transaction trust, behavioral trust.
Explain trust score lifecycle.

# 2. TRUST SCORE ARCHITECTURE
Design:
- Trust score components: identity verification weight, listing quality weight, behavioral pattern weight, violation history weight
- Trust score computation pipeline
- Trust score decay model (inactive tenants lose trust score over time)
- Trust score thresholds: UNVERIFIED / BASIC / VERIFIED / TRUSTED / PREMIUM
- Trust score effects on: listing visibility, discovery ranking, quota limits, feature access

# 3. FRAUD DETECTION ARCHITECTURE
Design:
- Behavioral fraud signals: rapid listing creation, price manipulation, contact info scraping patterns
- Account fraud signals: multiple accounts from same IP/device, bot-like activity
- Listing fraud signals: duplicate listings, stolen images, fake addresses
- Real-time fraud scoring pipeline
- Fraud score thresholds: LOW / MEDIUM / HIGH / CRITICAL
- Automated actions by score: warn / restrict / suspend / ban

# 4. CONTENT MODERATION ARCHITECTURE
Design:
- AI-first moderation pipeline (automated pass before human review)
- Human review queue for flagged content
- Moderation case lifecycle: reported → triaged → reviewed → actioned → appealed → resolved
- Content categories: listing text, images, user profiles, messages
- AI moderation confidence thresholds: auto-approve / auto-reject / human-required
- Moderation latency SLOs: < 30s for AI pass, < 4h for human review

# 5. REPORTING SYSTEM
Design:
- Report types: spam, fraud, inappropriate content, misleading listing, abuse
- Report routing: by type and severity to correct moderation queue
- Report deduplication (same content reported multiple times)
- Reporter trust weighting (trusted reporters get faster processing)
- Report analytics: volume by type, resolution time, false positive rate

# 6. ENFORCEMENT ARCHITECTURE
Design:
- Enforcement actions: warn / content_removal / temporary_restriction / suspension / permanent_ban
- Enforcement lifecycle with appeal window
- Enforcement logging (immutable audit trail)
- Tenant-level enforcement vs listing-level enforcement
- Platform-level enforcement (Super Admin only)
- Enforcement notification delivery

# 7. APPEALS SYSTEM
Design:
- Appeal submission flow
- Appeal review assignment (human moderator)
- Appeal decision: upheld / overturned / reduced
- Appeal SLO: 48h response, 7-day resolution
- Appeal analytics

# 8. VERIFICATION SYSTEM
Design:
- Identity verification tiers: email / phone / government ID / business registration
- Verification provider integration strategy (Stripe Identity, manual review)
- Verification badge display
- Verification expiry and renewal
- Verification failure handling

# 9. AI MODERATION INTEGRATION
Design:
- AI model selection: text moderation (OpenAI Moderation API compatible), image moderation
- AI confidence scoring per content type
- AI moderation feedback loop (human corrections improve model)
- AI moderation cost tracking
- AI moderation SLO monitoring

# 10. TRUST & SAFETY EVENTS
Define complete event taxonomy:
- report_submitted / report_triaged / report_resolved
- moderation_case_created / case_escalated / case_closed
- enforcement_action_taken / enforcement_appealed / enforcement_resolved
- trust_score_updated / trust_score_degraded / trust_score_restored
- verification_requested / verification_passed / verification_failed
- fraud_signal_generated / fraud_score_updated / fraud_action_triggered

# 11. PLATFORM SAFETY GOVERNANCE
Design:
- Policy management system: versioned platform policies
- Policy enforcement automation
- Regulatory compliance readiness (GDPR data deletion, DMCA takedowns)
- Safety SLO dashboard for Super Admin

# 12. TRUST DOMAIN SERVICE BOUNDARIES
Define domain ownership, event contracts, forbidden dependencies.

# 13. TRUST IMPLEMENTATION ROADMAP
Phases T1–T5 with deliverables, dependencies, complexity, acceptance criteria.

====================================================
RULES
====================================================
Think like: Principal Trust Architect at Airbnb + Fraud Systems Lead at Stripe + Safety Infrastructure Architect at Meta Marketplace.
```

---

## STEP AE — FRONTEND APPLICATION ARCHITECTURE

```
You are a world-class Principal Frontend Architect, React Application Systems Designer, Multi-App Platform Frontend Engineer, AI-Native UX Architect, and Enterprise Design System Architect.

You are designing the COMPLETE frontend architecture for an EXISTING AI-Native Multi-Tenant Marketplace Operating System.

IMPORTANT:
- DO NOT redesign backend architecture
- DO NOT generate UI component code yet
- DO NOT generate page-level implementation code yet
- DESIGN the complete frontend architecture, structure, and execution plan
- CONTINUE from: Master Platform Blueprint, PRD Bible, Database Master Design, Supabase Blueprint, Backend Architecture (STEP AD)

====================================================
CURRENT STACK (LOCKED)
====================================================
- Next.js 15 (App Router)
- React 19
- TypeScript
- TailwindCSS v4
- shadcn/ui
- Zustand (state)
- TanStack Query v5 (data fetching)
- Recharts (charts)
- Framer Motion (animations)
- next-themes (dark/light mode)
- Zod + React Hook Form (validation)

====================================================
OBJECTIVE
====================================================

Generate the COMPLETE:
🔥 FRONTEND APPLICATION ARCHITECTURE BLUEPRINT

====================================================
REQUIRED OUTPUT
====================================================

# 1. FRONTEND PLATFORM MODEL
Define the three frontend applications living in one Next.js monorepo:
- Public Marketplace App (discovery, listings, AI-powered feed)
- Tenant Company Dashboard (SaaS management, analytics, team, CRM)
- Super Admin Console (platform control plane)

Explain routing separation, layout isolation, auth isolation, state isolation.

# 2. COMPLETE FOLDER STRUCTURE
Generate the full Next.js App Router folder tree for all three apps.
Include: route groups, layouts, pages, loading states, error boundaries, not-found pages.

Structure must cover:
app/
├── (public)/           ← marketplace
├── (dashboard)/        ← tenant company
├── (super-admin)/      ← platform admin
├── (auth)/             ← shared auth
└── api/                ← API routes

features/
├── marketplace/
├── tenant/
├── super-admin/
├── ai/
├── billing/
├── analytics/
├── moderation/
└── platform-core/

# 3. ROUTING & MIDDLEWARE ARCHITECTURE
Design:
- Auth middleware routing logic per app
- Role-based route protection (SUPER_ADMIN vs TENANT_OWNER vs AGENT)
- Tenant context injection at middleware level
- Redirect logic for unauthenticated / unauthorized access
- API route organization by domain

# 4. STATE MANAGEMENT ARCHITECTURE
Design complete Zustand store structure:
- authStore: user, session, company_id, role, permissions
- tenantStore: company context, branding, plan, quotas
- uiStore: sidebar, modals, theme, notifications
- adminStore: super admin session, impersonation prevention
- realtimeStore: live notification counts, presence, feed updates
- analyticsStore: current period selections, filter state

Design TanStack Query structure:
- Query key factory per domain
- Cache invalidation strategy per domain
- Optimistic update patterns for mutations
- Prefetching strategy for navigation

# 5. SUPER ADMIN CONSOLE ARCHITECTURE
Design every module:
- Tenant management: list, view, suspend, reactivate tenants
- User management: search, impersonation prevention, role management
- Platform analytics: global KPIs, revenue, AI usage, churn
- Billing management: subscription overrides, invoice views, usage audit
- Moderation center: live queues, case management, enforcement
- AI control center: prompt registry, model configs, experiment flags
- Feature flags: rollout management, A/B test controls
- System health: API status, queue depths, error rates
- Audit logs: full platform action history with filter/search

# 6. PUBLIC MARKETPLACE APP ARCHITECTURE
Design:
- AI-powered home feed (personalized listing cards)
- Semantic search with filters and facets
- Listing detail page (rich media, AI insights, lead capture)
- Saved searches and alerts
- User profile and preferences
- AI recommendation widgets
- Map view integration points

# 7. SHARED COMPONENT LIBRARY ARCHITECTURE
Design the component hierarchy:
- Layout: Sidebar, Header, MobileSidebar, PageContainer, SplitLayout
- Data display: DataTable, StatsCard, KPICard, ChartContainer, Badge, Tag
- Forms: FormField, Select, DateRangePicker, MultiSelect, FileUpload
- Feedback: LoadingState, EmptyState, ErrorBoundary, Toast, ConfirmDialog
- AI: AIInsightCard, RecommendationWidget, SemanticSearchBar
- Billing: PlanBadge, QuotaBar, UpgradePrompt

# 8. AI UX ARCHITECTURE
Design:
- How AI insights surface in the UI (inline cards, tooltips, panels)
- Recommendation widget placement in the marketplace feed
- Semantic search UX (natural language input, AI-interpreted results)
- AI loading states (skeleton vs streaming vs instant)
- AI error states (degraded mode when AI is unavailable)
- AI explainability display ("Why this recommendation?")

# 9. REALTIME UX ARCHITECTURE
Design:
- Notification bell with live count badge
- Live chat message delivery in messages page
- Real-time presence indicators (who else is viewing a listing)
- Live analytics dashboard data refresh
- Moderation queue live updates (Super Admin)
- Feed freshness indicators

# 10. PERFORMANCE ARCHITECTURE
Design:
- Route-level code splitting strategy
- Image optimization strategy (listing photos, avatars)
- Infinite scroll vs pagination per context
- TanStack Query prefetch on hover/navigation
- Static vs dynamic rendering decision per page
- Edge caching strategy for public marketplace pages

# 11. DESIGN SYSTEM ARCHITECTURE
Design:
- Color system: semantic tokens for light/dark mode
- Typography scale
- Spacing system
- Component variant strategy (CVA pattern)
- Animation tokens (Framer Motion presets)
- Glassmorphism usage guidelines (when to apply, when not)

# 12. MULTI-TENANT BRANDING ARCHITECTURE
Design:
- Per-tenant brand injection at layout level
- CSS variable overrides per tenant (primary color, logo, font)
- Brand preview system (Customization page)
- White-label readiness

# 13. ERROR & LOADING STATE ARCHITECTURE
Design standardized patterns for:
- Page-level loading (skeleton screens per page type)
- Component-level loading (inline spinners, shimmer)
- API error states (retry, fallback data, graceful degradation)
- Network offline state
- Auth expiry handling

# 14. TESTING ARCHITECTURE
Design:
- Unit test strategy: component tests with Testing Library
- Integration test strategy: page flows with Playwright
- Visual regression: key page snapshots
- API mock strategy: MSW (Mock Service Worker)

# 15. FRONTEND IMPLEMENTATION ROADMAP
Generate phases FE1–FE8:
- FE1: Foundation (layout, auth, routing, stores)
- FE2: Company Dashboard (all tenant pages)
- FE3: Super Admin Console (all admin pages)
- FE4: Public Marketplace App (feed, search, listing detail)
- FE5: AI UX layer (insights, recommendations, semantic search)
- FE6: Realtime layer (notifications, chat, live data)
- FE7: Billing UX (upgrade flows, quota bars, plan management)
- FE8: Polish (animations, performance, accessibility, testing)

For each phase: pages/components delivered, dependencies, complexity, acceptance criteria.

====================================================
RULES
====================================================
Think like: Principal Frontend Architect at Vercel + UX Systems Lead at Airbnb + AI Product Engineer at OpenAI.
Output must be production-grade, performance-first, AI-native, multi-tenant safe.
```

---

## MASTER IMPLEMENTATION PROMPT — START BUILDING (Phase 1 of N)

> Use this prompt when you are ready to begin actual code generation. Feed it the outputs of STEP AA (Database Design) and STEP AB (Supabase Blueprint) as context first.

```
You are a world-class Full-Stack Platform Engineer, Supabase Architect, and Next.js 15 Expert.

You are implementing the backend foundation of an AI-Native Multi-Tenant Marketplace Operating System.

CRITICAL RULES:
- DO NOT simplify the architecture
- DO NOT use mock data where real Supabase integration is specified
- DO NOT skip RLS policies
- WRITE complete, production-ready code
- INCLUDE TypeScript types for everything
- INCLUDE error handling for every operation
- INCLUDE JSDoc comments explaining architecture decisions

====================================================
EXISTING CODE BASE
====================================================

The project already exists at: company-dashboard/
It already contains:
- Next.js 15 App Router structure
- Basic Supabase auth (client + server clients)
- supabase/migrations/001_initial_schema.sql (users, companies, listings, basic tables)
- Company Dashboard pages with mock data (home, listings, team, analytics, notifications, messages, customize, settings)
- middleware.ts with basic route protection

====================================================
PHASE 1 IMPLEMENTATION GOAL
====================================================

Implement the COMPLETE database foundation.

Step 1.1 — Core Domain Migrations
Write Supabase SQL migrations for:

Migration 002_identity_domain.sql:
- user_profiles (id, auth_user_id, display_name, avatar_url, phone, verified_at, trust_score, status, created_at, updated_at)
- user_preferences (user_id, notification_settings jsonb, theme_preference, language, timezone)
- user_sessions (id, user_id, device_fingerprint, ip_address, last_active_at, created_at)
- RLS: users can only read/write their own records

Migration 003_tenant_domain.sql:
- organizations (id, name, slug, logo_url, brand_color, plan_tier, status, stripe_customer_id, created_at, updated_at)
- organization_members (id, organization_id, user_id, role, invited_by, accepted_at, created_at)
- organization_branches (id, organization_id, name, address, city, country, created_at)
- RLS: members can read org data, only owners/admins can write

Migration 004_marketplace_domain.sql:
- listing_categories (id, name, slug, parent_id, icon, sort_order)
- listings_v2 (id, organization_id, created_by, title, description, listing_type, status, price, currency, address, city, lat, lng, attributes jsonb, quality_score, trust_score, published_at, archived_at, created_at, updated_at)
- listing_media (id, listing_id, url, type, position, is_primary, processing_status)
- listing_interactions (id, listing_id, user_id, session_id, interaction_type, duration_seconds, created_at)
- favorites (id, listing_id, user_id, created_at)
- RLS: public read for published listings, org members can write their org's listings

Migration 005_ai_domain.sql:
- listing_embeddings (id, listing_id, embedding vector(1536), model_version, generated_at, refreshed_at)
- user_embeddings (id, user_id, embedding vector(1536), model_version, generated_at)
- ai_inference_logs (id, organization_id, user_id, model, prompt_tokens, completion_tokens, cost_usd, latency_ms, created_at)
- prompt_registry (id, name, version, content, model, temperature, max_tokens, is_active, created_at)
- RLS: service_role only for write, authenticated for read on own records

Migration 006_billing_domain.sql:
- subscription_plans (id, name, slug, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, features jsonb, quotas jsonb, is_active)
- tenant_subscriptions (id, organization_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at, created_at, updated_at)
- tenant_quota_usage (id, organization_id, period_start, listings_used, ai_calls_used, storage_used_mb, team_seats_used, updated_at)
- invoices (id, organization_id, stripe_invoice_id, amount_cents, currency, status, paid_at, created_at)
- RLS: tenant owners/admins can read their own billing, service_role writes

Migration 007_analytics_domain.sql:
- platform_events (id, event_name, organization_id, user_id, resource_type, resource_id, payload jsonb, occurred_at) PARTITION BY RANGE (occurred_at)
- analytics_snapshots (id, organization_id, period_date, metric_name, metric_value, created_at)
- RLS: service_role writes, org members read their own analytics

Migration 008_audit_domain.sql:
- audit_logs (id, actor_id, actor_role, action, resource_type, resource_id, organization_id, ip_address, payload jsonb, occurred_at) PARTITION BY RANGE (occurred_at)
- RLS: service_role writes, super_admin reads all, org owners read own

For EACH migration include:
- All columns with correct types and constraints
- Primary key as UUID with gen_random_uuid() default
- created_at / updated_at with triggers
- Foreign key relationships with appropriate ON DELETE behavior
- Indexes on all foreign keys and commonly filtered columns
- Full RLS policies (SELECT, INSERT, UPDATE, DELETE) for every role
- Comments explaining each table's purpose

Step 1.2 — TypeScript Type Definitions
For EACH new table, generate a complete TypeScript interface in types/ directory.
Include both the raw DB row type and the application-level type with relations.

Step 1.3 — Supabase Service Layer
For EACH domain, generate a service file in services/:
- listingsService.ts: CRUD + search + interaction tracking
- analyticsService.ts: event recording + snapshot fetching
- billingService.ts: quota checking + subscription fetching
- aiService.ts: embedding management + inference logging

Step 1.4 — Update Existing Components
Update the Company Dashboard mock-data pages to use real Supabase queries:
- app/(dashboard)/page.tsx: real stats from analytics_snapshots
- app/(dashboard)/listings/page.tsx: real listings from listings_v2
- app/(dashboard)/team/page.tsx: real members from organization_members
- app/(dashboard)/analytics/page.tsx: real charts from analytics_snapshots

====================================================
OUTPUT FORMAT
====================================================

For each file output:
1. Full file path
2. Complete file content (no truncation, no "add your logic here" placeholders)
3. Brief explanation of key decisions

Start with the migrations, then types, then services, then component updates.
```

---

## QUICK REFERENCE: STEP EXECUTION ORDER

The correct order to run everything is:

1. Run **STEP 5** prompt (Monetization Architecture) → get architecture doc
2. Run **STEP 6** prompt (Trust & Safety Architecture) → get architecture doc
3. Run **STEP AE** prompt (Frontend Architecture) → get frontend blueprint
4. Run the **MASTER IMPLEMENTATION PROMPT** → get actual migration SQL + TypeScript code
5. After Phase 1 code is committed, continue with Phase 2 (Super Admin UI implementation)
6. Continue with Phase 3 (Public Marketplace App)
7. Continue with Phase 4 (AI Layer implementation)
8. Continue with Phase 5 (Billing / Stripe integration)

---

## CONTEXT BLOCK TO INCLUDE IN EVERY PROMPT

Paste this at the top of every new conversation to preserve context:

```
PLATFORM CONTEXT:
- Project: AI-Native Multi-Tenant Marketplace Operating System (originally real estate, evolving to universal marketplace)
- Tech: Next.js 15 + React 19 + TypeScript + TailwindCSS v4 + shadcn/ui + Zustand + TanStack Query + Supabase + PostgreSQL + pgvector
- Architecture: Hybrid Modular Monolith, Domain-Driven, Event-Driven evolution path
- What's built: Basic Next.js Company Dashboard + Supabase auth + 001_initial_schema.sql
- Architecture docs completed: STEP 1–4, Master Blueprint, STEP X, STEP Z, STEP AA, STEP AB, STEP AC, STEP AD
- Current target: [INSERT CURRENT STEP]
- GitHub repo: [INSERT YOUR REPO URL]
- Supabase project: [INSERT YOUR PROJECT URL]
```

---

*Generated by Claude — Full audit and completion prompt for AI Marketplace Operating System build*
