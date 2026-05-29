# 🗺️ Master Platform Site Map

> **Status:** Active  
> **Purpose:** Defines the complete frontend routing architecture and view hierarchy for the platform.

---

## 1. Public & Marketing Interfaces
These routes are unauthenticated and optimized for SEO, discovery, and conversion.

* `/` - **Platform Landing Page** (Marketing, Value Proposition, Global Search)
* `/pricing` - **Transparent Tiered Pricing** & Feature Comparison
* `/marketplace` - **Public AI Discovery & Agent Directory** (SEO-indexed listings)
* `/login` - **Universal Authentication Gateway** (OAuth, Magic Links, SSO)
* `/register` - **Tenant Onboarding & KYC Flow** (Multi-step workspace creation)

---

## 2. Tenant Dashboard (`/app/...` or `/dashboard/...`)
These routes are protected via Next.js Middleware and require a valid Tenant JWT.

* `/overview` - **Primary KPI Dashboard** (Revenue, Feed Impressions, Active Listings)
* `/listings` - **Asset & Agent Management** (CRUD, Embeddings Status, Quality Score)
  * `/listings/new` - Create new listing wizard
  * `/listings/[id]/edit` - Detail configuration and metadata
* `/analytics` - **Engagement Metrics** (Token Usage, Re-Ranking Metrics, Click-through rates)
* `/messages` - **Communication Center** (Inter-Tenant, Buyer inquiries, Support threads)
* `/team` - **User Management** (RBAC, Role Assignments, Invitations)
* `/billing` - **Financials** (Subscription plans, Invoices, Token Top-Ups)
* `/ui-customization` - **White-labeling** (Brand colors, Custom Domain Mapping)
* `/settings` - **Workspace Configuration** (Profile, Security, Webhooks, API Keys)

---

## 3. Super Admin Governance Plane (`/super-admin/...`)
Strictly protected routes for internal platform operators. Requires `x-reverso-admin-role`.

* `/super-admin/dashboard` - **Global Platform KPIs** (Total MRR, Active Tenants, Error Rates, Latency)
* `/super-admin/tenants` - **Tenant Oversight** (Impersonation, Plan Overrides, Manual Suspension)
* `/super-admin/moderation` - **Trust & Safety Queue** (Flagged Content, Fraud Alerts, Review overrides)
* `/super-admin/ai-control` - **Inference Management** (Model Weights, Re-Ranking Experiments, Token Gate Limits)
* `/super-admin/billing` - **Platform Ledger** (Stripe Sync, Global Usage Audits, Payouts)
* `/super-admin/settings` - **Global Operations** (Feature Flags, Maintenance Broadcasts, Schema Migrations)

---

## Architectural Notes
- **Realtime Updates:** All dashboard routes rely on Supabase Realtime (WebSockets) for instant state mutations (e.g., live notifications, feed re-ranking) rather than traditional HTTP polling.
- **Tenant Context:** Any route under `/app` strictly enforces Row-Level Security (RLS) scoped to the current `tenant_id`.
