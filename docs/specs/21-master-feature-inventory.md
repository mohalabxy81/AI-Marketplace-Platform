# SPEC 21 — MASTER FEATURE INVENTORY & CAPABILITY MAP

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture
> **Status**: Canonical Product Reference — Single Source of Truth
> **Version**: 1.0.0
> **Last Updated**: 2026-05-30
> **Owned By**: Product, Engineering, UX, QA, AI, Analytics, Operations
> **Supersedes**: SITEMAP.md (navigation layer extracted from here)

---

## Document Purpose

This document is the **authoritative single source of truth** for every product capability, screen, user journey, role, AI feature, analytics feature, billing feature, and trust feature on the AI-Native Multi-Tenant Marketplace Operating System. It bridges approved architecture with buildable product specifications.

**Who uses this document:**
- **Product Managers** → PRD authoring, feature scoping, story writing
- **UX Designers** → Information architecture, screen design, flow mapping
- **Engineering Leads** → Sprint planning, feature ownership, API contract definitions
- **QA Teams** → Test case generation, coverage matrices
- **AI Teams** → Model requirements, feature inputs/outputs
- **Analytics Teams** → Event tracking, KPI definitions, dashboard specs
- **Operations Teams** → Support workflows, escalation paths, admin tooling

---

## TABLE OF CONTENTS

1. [Platform Capability Map](#1-platform-capability-map)
2. [Role Inventory](#2-role-inventory)
3. [Feature Inventory](#3-feature-inventory)
4. [Screen Inventory](#4-screen-inventory)
5. [Navigation Architecture](#5-navigation-architecture)
6. [Buyer Journey Map](#6-buyer-journey-map)
7. [Seller Journey Map](#7-seller-journey-map)
8. [Agent Journey Map](#8-agent-journey-map)
9. [Company Journey Map](#9-company-journey-map)
10. [Super Admin Journey Map](#10-super-admin-journey-map)
11. [Feature Access Matrix](#11-feature-access-matrix)
12. [MVP Feature Definition](#12-mvp-feature-definition)
13. [AI Feature Inventory](#13-ai-feature-inventory)
14. [Analytics Feature Inventory](#14-analytics-feature-inventory)
15. [Billing Feature Inventory](#15-billing-feature-inventory)
16. [Trust & Safety Feature Inventory](#16-trust--safety-feature-inventory)
17. [Prioritization Matrix](#17-prioritization-matrix)
18. [Final Product Map](#18-final-product-map)

---

# 1. PLATFORM CAPABILITY MAP

> **Structure**: Domain → Capability → Feature → Subfeature

---

## 1.1 Identity Domain

### Capability: Authentication
- **Feature: Email/Password Auth**
  - Subfeature: Registration with email verification
  - Subfeature: Login with rate-limited attempts
  - Subfeature: Password reset via secure token
  - Subfeature: Password strength enforcement (NIST 800-63B)
- **Feature: OAuth Social Login**
  - Subfeature: Google OAuth 2.0 PKCE flow
  - Subfeature: GitHub OAuth (V1)
  - Subfeature: LinkedIn OAuth (V2)
- **Feature: Magic Link / Passwordless**
  - Subfeature: One-time link via email (15-min expiry)
  - Subfeature: Link click → session creation → redirect
- **Feature: SSO / SAML**
  - Subfeature: SAML 2.0 SP-initiated flow (V2)
  - Subfeature: Okta connector (V2)
  - Subfeature: Azure Active Directory connector (V2)
  - Subfeature: Google Workspace connector (V2)
  - Subfeature: SCIM user provisioning/deprovisioning (V3)
- **Feature: Multi-Factor Authentication (MFA)**
  - Subfeature: TOTP authenticator app (Google Authenticator, Authy)
  - Subfeature: SMS OTP (V1)
  - Subfeature: Hardware key / YubiKey (V3 Enterprise)
  - Subfeature: MFA recovery codes
  - Subfeature: Per-tenant MFA enforcement policy
- **Feature: API Key Authentication**
  - Subfeature: Key generation with scope restriction
  - Subfeature: Key rotation policy
  - Subfeature: Key revocation
  - Subfeature: Per-key usage analytics

### Capability: Authorization
- **Feature: Role-Based Access Control (RBAC)**
  - Subfeature: Platform roles (Super Admin, Platform Operator)
  - Subfeature: Tenant roles (Owner, Admin, Member, Viewer)
  - Subfeature: Marketplace roles (Agent, Sales Rep, Content Moderator)
  - Subfeature: Role assignment by Org Admin
  - Subfeature: Role inheritance model
- **Feature: JWT Claims Management**
  - Subfeature: Custom claim injection at Edge (tenant_id, role, tier, scopes)
  - Subfeature: JWKS public key distribution
  - Subfeature: Token expiry and refresh flow
  - Subfeature: Token revocation blacklist (V1)
- **Feature: Permission Scopes**
  - Subfeature: Read/Write/Admin scope granularity
  - Subfeature: Resource-level permission scoping
  - Subfeature: API key scope restrictions

### Capability: Session Management
- **Feature: Session Lifecycle**
  - Subfeature: Session creation on login
  - Subfeature: Session expiry (configurable, default 24h)
  - Subfeature: Silent token refresh
  - Subfeature: Session revocation on logout
  - Subfeature: Force-logout by Admin
- **Feature: Concurrent Session Control**
  - Subfeature: Active session listing per user
  - Subfeature: Max concurrent sessions limit (V1)
  - Subfeature: Session geolocation display

---

## 1.2 Tenant Management Domain

### Capability: Organization Provisioning
- **Feature: Organization Creation**
  - Subfeature: Multi-step org setup wizard
  - Subfeature: Organization name, slug, country, industry
  - Subfeature: Plan selection at signup
  - Subfeature: Automatic schema provisioning
  - Subfeature: Default catalog creation
  - Subfeature: Quota record initialization
- **Feature: Workspace Management**
  - Subfeature: Workspace-to-tenant mapping
  - Subfeature: Data isolation enforcement (RLS)
  - Subfeature: Custom database schema per tenant
- **Feature: Tenant Lifecycle**
  - Subfeature: Tenant activation
  - Subfeature: Tenant suspension (manual + automated)
  - Subfeature: Tenant reactivation
  - Subfeature: Tenant soft-delete (data retained 90 days)
  - Subfeature: Tenant hard-delete + data purge (GDPR)

### Capability: Domain Management
- **Feature: Custom Domain Mapping** (V1)
  - Subfeature: CNAME-based custom domain setup
  - Subfeature: TLS certificate provisioning (Let's Encrypt)
  - Subfeature: Domain verification flow
  - Subfeature: Domain redirect rules
- **Feature: Subdomain Routing**
  - Subfeature: Platform-subdomain assignment ({slug}.platform.io)
  - Subfeature: Wildcard subdomain resolution

### Capability: Plan & Quota Management
- **Feature: Plan Enforcement**
  - Subfeature: Listing quota limits
  - Subfeature: API request rate limits
  - Subfeature: AI token quota limits
  - Subfeature: Team seat limits
  - Subfeature: Storage quota limits
  - Subfeature: Feature flag gating per plan
- **Feature: Plan Upgrades / Downgrades**
  - Subfeature: Self-serve plan change
  - Subfeature: Proration calculation
  - Subfeature: Downgrade quota enforcement (listing archiving if over limit)

### Capability: Feature Flag Management
- **Feature: Platform-Level Flags**
  - Subfeature: Super Admin controls global flag states
  - Subfeature: Staged rollout percentages
  - Subfeature: Emergency kill-switch per feature
- **Feature: Tenant-Level Overrides**
  - Subfeature: Override flags for specific tenants
  - Subfeature: Beta feature opt-in

---

## 1.3 Organization & Team Domain

### Capability: Member Management
- **Feature: Team Invitations**
  - Subfeature: Email invitation with expiry (72h)
  - Subfeature: Invitation resend
  - Subfeature: Bulk invite via CSV (V1)
  - Subfeature: Pending invitation management
- **Feature: Role Management**
  - Subfeature: Role assignment per member
  - Subfeature: Role change audit trail
  - Subfeature: Self-service role request (V2)
- **Feature: Member Removal**
  - Subfeature: Revoke access immediately
  - Subfeature: Transfer ownership before removal
  - Subfeature: Data ownership reassignment

### Capability: Branch Management (V1)
- **Feature: Branch Creation**
  - Subfeature: Branch as sub-workspace under parent org
  - Subfeature: Branch-specific listing catalogs
  - Subfeature: Branch-specific member roles
- **Feature: Branch Analytics**
  - Subfeature: Aggregated branch-level KPIs
  - Subfeature: Cross-branch comparison reports

---

## 1.4 Marketplace Domain

### Capability: Listing Management
- **Feature: Listing Creation**
  - Subfeature: Rich text description editor (Markdown/WYSIWYG)
  - Subfeature: Title (required, max 200 chars)
  - Subfeature: Category assignment (2-level taxonomy)
  - Subfeature: Price setting (fixed, hourly, subscription)
  - Subfeature: Tag assignment (up to 10 tags)
  - Subfeature: Custom attribute fields (per category, V2)
  - Subfeature: Multi-image gallery (1 primary + 5 gallery)
  - Subfeature: Video attachment (V2)
  - Subfeature: Document attachment (PDF, V1)
- **Feature: Listing Status Workflow**
  - Subfeature: Draft → Pending Review (automatic on submit)
  - Subfeature: Pending Review → Active (after moderation approval)
  - Subfeature: Active → Archived (manual or expiry-based)
  - Subfeature: Active → Quarantined (automated fraud detection)
  - Subfeature: Quarantined → Active (Super Admin approval)
  - Subfeature: Any → Deleted (soft delete, 30-day retention)
- **Feature: Listing Versioning** (V2)
  - Subfeature: Version history with changelog
  - Subfeature: Diff view between versions
  - Subfeature: Rollback to previous version
- **Feature: Bulk Operations** (V1)
  - Subfeature: CSV bulk import
  - Subfeature: Bulk status change
  - Subfeature: Bulk price update
  - Subfeature: Bulk tagging
- **Feature: Listing Expiry** (V2)
  - Subfeature: Auto-archive on expiry date
  - Subfeature: Renewal notification (7 days before expiry)
  - Subfeature: One-click renewal

### Capability: Category & Taxonomy
- **Feature: Platform Category Tree**
  - Subfeature: 2-level category hierarchy (MVP)
  - Subfeature: Category icons and descriptions
  - Subfeature: Category SEO slugs
  - Subfeature: Category-level attribute templates
- **Feature: Dynamic Custom Categories** (V2)
  - Subfeature: Tenant-defined categories
  - Subfeature: Category-attribute mapping
  - Subfeature: Custom category icons

### Capability: Reviews & Ratings (V2)
- **Feature: Buyer Reviews**
  - Subfeature: Star rating (1-5)
  - Subfeature: Review text (min 50 chars)
  - Subfeature: Review verification (confirmed purchase)
  - Subfeature: Review moderation
- **Feature: Seller Response**
  - Subfeature: Public response to reviews
  - Subfeature: Response moderation

### Capability: Lead Management
- **Feature: Lead Capture**
  - Subfeature: Inquiry form on listing detail page
  - Subfeature: Lead assignment to Agent/Sales Rep
  - Subfeature: Lead status tracking (New, Contacted, Qualified, Converted, Closed)
- **Feature: Lead Notifications**
  - Subfeature: Real-time push on new inquiry (WebSocket)
  - Subfeature: Email notification on new lead
- **Feature: Lead Analytics**
  - Subfeature: Lead source attribution
  - Subfeature: Lead conversion rate per listing

### Capability: Media Management
- **Feature: Image Management**
  - Subfeature: Upload (JPEG, PNG, WebP, max 10MB per image)
  - Subfeature: Automatic resizing (thumbnail, medium, large)
  - Subfeature: CDN delivery via CloudFront/Cloudflare
  - Subfeature: Alt text for accessibility/SEO
- **Feature: Document Management** (V1)
  - Subfeature: PDF attachment (max 50MB)
  - Subfeature: Secure signed URL delivery

---

## 1.5 Discovery Domain

### Capability: Vector Search
- **Feature: Semantic Search**
  - Subfeature: Natural language query → embedding → cosine retrieval
  - Subfeature: Stage 1: HNSW pgvector retrieval (top-500, <15ms)
  - Subfeature: Stage 2: Light ranking (trust × freshness × bid, <5ms)
  - Subfeature: Stage 3: Neural re-ranking XGBoost (top-25, V1)
  - Subfeature: Stage 4: Exploration injection ε=0.10 (V1)
  - Subfeature: Tenant-scoped vector isolation
- **Feature: Hybrid Search**
  - Subfeature: BM25 keyword fallback when vector index unavailable
  - Subfeature: Weighted hybrid score (vector + keyword blend)
  - Subfeature: Fuzzy typo-tolerance (pg_trgm)

### Capability: Personalized Feed
- **Feature: Feed Generation**
  - Subfeature: User preference vector retrieval (Redis)
  - Subfeature: Cold-start: tenant-average vector (new users)
  - Subfeature: Personalized feed (top-25 for authenticated users)
  - Subfeature: Non-personalized trending feed (unauthenticated)
  - Subfeature: Feed pagination (infinite scroll)
  - Subfeature: Feed freshness guarantee (new listings surfacing)
- **Feature: Real-Time Preference Updates** (V1)
  - Subfeature: Fast loop: clickstream → vector adjustment (α=0.85 EMA)
  - Subfeature: Session-level preference decay
  - Subfeature: Redis cache sync after each interaction

### Capability: Faceted Filtering
- **Feature: Filter System**
  - Subfeature: Category filter (single/multi-select)
  - Subfeature: Price range filter
  - Subfeature: Rating filter (V2)
  - Subfeature: Location filter (V2, geo-radius)
  - Subfeature: Tag multi-select filter
  - Subfeature: Date range filter (listing freshness)
  - Subfeature: Seller/Agent verification filter
- **Feature: Sort Options**
  - Subfeature: Relevance (default — vector similarity)
  - Subfeature: Newest first
  - Subfeature: Price low-to-high / high-to-low
  - Subfeature: Most popular (view count)
  - Subfeature: Top rated (V2)

### Capability: Search UX
- **Feature: Typeahead / Autocomplete**
  - Subfeature: Real-time suggestions (debounced, 300ms)
  - Subfeature: Recent searches (local storage)
  - Subfeature: Trending search terms
  - Subfeature: Category suggestions
- **Feature: Search Results**
  - Subfeature: Grid view (default)
  - Subfeature: List view
  - Subfeature: Results count + pagination
  - Subfeature: "No results" state with suggestions
  - Subfeature: Sponsored listing badges

### Capability: Recommendations
- **Feature: Similar Listings**
  - Subfeature: Vector similarity on current listing view
  - Subfeature: "Customers also viewed" widget (V1)
- **Feature: Collaborative Filtering** (V2)
  - Subfeature: User-to-user similarity recommendations
  - Subfeature: Item-to-item similarity recommendations
  - Subfeature: Cold-start bootstrapping (content-based)

---

## 1.6 AI Systems Domain

### Capability: Inference Gateway
- **Feature: LLM Routing**
  - Subfeature: OpenAI GPT-4o-mini (moderation, default)
  - Subfeature: OpenAI GPT-4o (premium inference)
  - Subfeature: Anthropic Claude 3 Haiku (V1 fallback)
  - Subfeature: Llama 3-8B local execution (V2 cost optimization)
  - Subfeature: Provider fallback chain
  - Subfeature: Provider health monitoring
- **Feature: Token Guard**
  - Subfeature: Leaky-bucket quota per tenant
  - Subfeature: Hard quota enforcement (request blocking)
  - Subfeature: Soft quota warning at 80% usage
  - Subfeature: Tier-differentiated limits
  - Subfeature: Real-time usage meter
- **Feature: Semantic Cache**
  - Subfeature: Prompt → embedding hash → Redis lookup (V1)
  - Subfeature: Cosine similarity threshold ≥ 0.96
  - Subfeature: Cache TTL management
  - Subfeature: Cache hit/miss analytics

### Capability: Embedding System
- **Feature: Embedding Generation**
  - Subfeature: text-embedding-3-small (1536 dimensions, default)
  - Subfeature: text-embedding-3-large (3072d, enterprise V3)
  - Subfeature: Batch embedding jobs (background queue)
  - Subfeature: Embedding refresh on listing update
  - Subfeature: Embedding versioning + migration
- **Feature: Vector Store Management**
  - Subfeature: HNSW index build/rebuild
  - Subfeature: Tenant-filtered vector retrieval
  - Subfeature: Index health monitoring
  - Subfeature: Background rebuild scheduling

### Capability: Content Intelligence
- **Feature: Listing Enrichment**
  - Subfeature: AI-generated listing description improvement suggestions
  - Subfeature: Auto-tag suggestion from description
  - Subfeature: SEO title optimization suggestions
  - Subfeature: Quality score computation (V1)
- **Feature: Content Analysis**
  - Subfeature: Readability scoring
  - Subfeature: Keyword density analysis
  - Subfeature: Missing field detection

### Capability: AI Operations
- **Feature: Model Registry**
  - Subfeature: Available model catalog
  - Subfeature: Model version pinning
  - Subfeature: Model experiment tracking
  - Subfeature: Cost-per-token tracking per model
- **Feature: Priority Queue**
  - Subfeature: High-priority queue (user-facing, <200ms)
  - Subfeature: Low-priority queue (background batch)
  - Subfeature: Queue depth monitoring
  - Subfeature: Job timeout and retry policies

---

## 1.7 Analytics Domain

### Capability: Marketplace Analytics
- **Feature: Listing Performance**
  - Subfeature: View count (total, unique)
  - Subfeature: Click-through rate (CTR)
  - Subfeature: Inquiry/lead conversion rate
  - Subfeature: Average time-on-listing
  - Subfeature: Listing performance rank
- **Feature: Discovery Analytics**
  - Subfeature: Feed impressions vs. clicks
  - Subfeature: Search query volume and trends
  - Subfeature: Category-level engagement
  - Subfeature: Zero-results rate
  - Subfeature: Discovery-to-lead funnel

### Capability: AI Analytics
- **Feature: Token Usage Analytics**
  - Subfeature: Daily/weekly/monthly token consumption
  - Subfeature: Usage by operation type (moderation, embedding, completion)
  - Subfeature: Cost estimation per period
  - Subfeature: Usage trend forecasting
- **Feature: AI Performance Analytics**
  - Subfeature: Cache hit rate tracking
  - Subfeature: Provider latency breakdown
  - Subfeature: Fallback trigger frequency
  - Subfeature: Re-ranking quality metrics (NDCG@10, V1)

### Capability: Revenue Analytics
- **Feature: Subscription Revenue**
  - Subfeature: MRR tracking
  - Subfeature: ARR projection
  - Subfeature: Revenue by plan tier
  - Subfeature: Churn analysis
- **Feature: Ad Revenue** (V1)
  - Subfeature: Ad spend by tenant
  - Subfeature: CPC/CPM breakdown
  - Subfeature: Ad auction win rate

### Capability: Cohort & Retention Analytics (V2)
- **Feature: Cohort Analysis**
  - Subfeature: Signup cohort retention curves
  - Subfeature: Feature adoption cohorts
  - Subfeature: Revenue cohort LTV
- **Feature: LTV Modeling**
  - Subfeature: 12-month LTV projection
  - Subfeature: LTV by acquisition channel

### Capability: Attribution Analytics (V2)
- **Feature: Multi-Touch Attribution**
  - Subfeature: First-touch attribution
  - Subfeature: Last-touch attribution
  - Subfeature: Linear attribution
  - Subfeature: Data-driven attribution (ML-based, V3)

---

## 1.8 Billing & Monetization Domain

### Capability: Subscription Management
- **Feature: Plan Management**
  - Subfeature: Starter plan (manual billing, MVP)
  - Subfeature: Growth plan (Stripe subscription, V1)
  - Subfeature: Enterprise plan (custom pricing, V1)
  - Subfeature: Self-serve plan upgrade/downgrade
- **Feature: Payment Processing**
  - Subfeature: Stripe Checkout integration (V1)
  - Subfeature: Credit card management
  - Subfeature: Invoice generation (PDF)
  - Subfeature: Payment failure handling + dunning
  - Subfeature: Billing portal (Stripe-hosted, V1)

### Capability: Usage-Based Billing
- **Feature: AI Token Metering**
  - Subfeature: Per-request token counting
  - Subfeature: Real-time usage ledger writes
  - Subfeature: Overage calculation and billing (V1)
  - Subfeature: Credit top-up (prepaid model)
- **Feature: Usage Reporting**
  - Subfeature: Real-time usage dashboard
  - Subfeature: Usage breakdown by feature
  - Subfeature: Invoice line items with usage detail

### Capability: Ad Auction System (V1)
- **Feature: Campaign Management**
  - Subfeature: CPC/CPM bid configuration
  - Subfeature: Budget cap (daily / monthly)
  - Subfeature: Keyword/category targeting
  - Subfeature: Scheduling (active hours)
- **Feature: Auction Engine**
  - Subfeature: Generalized second-price auction
  - Subfeature: Quality score adjustment
  - Subfeature: Real-time bid evaluation (<5ms)
  - Subfeature: Spend tracking and cap enforcement

---

## 1.9 Trust & Safety Domain

### Capability: Content Moderation
- **Feature: Pre-Publish Scan**
  - Subfeature: LLM toxicity scan (GPT-4o-mini)
  - Subfeature: Spam pattern detection
  - Subfeature: Prohibited content policy check
  - Subfeature: Auto-approve (score < 0.3)
  - Subfeature: Auto-quarantine (score > 0.7)
  - Subfeature: Human review queue (score 0.3–0.7)
- **Feature: Moderation Queue**
  - Subfeature: Priority-sorted review queue
  - Subfeature: One-click approve/reject
  - Subfeature: Moderation notes
  - Subfeature: Bulk moderation actions
  - Subfeature: SLA tracking (target: <24h review)
- **Feature: Appeals System** (V1)
  - Subfeature: Seller appeal submission
  - Subfeature: Appeal review workflow
  - Subfeature: Resolution notification

### Capability: Fraud Detection
- **Feature: Behavioral Anomaly Detection** (V1)
  - Subfeature: High-velocity listing creation detection
  - Subfeature: Unusual price manipulation detection
  - Subfeature: Review manipulation detection (V2)
  - Subfeature: Redis sliding window counters
- **Feature: Trust Scores**
  - Subfeature: Per-tenant trust score (0.2 – 1.0)
  - Subfeature: Score factors: moderation history, age, activity
  - Subfeature: Score decay over time (V1)
  - Subfeature: Score impact on discovery ranking
- **Feature: IP & Device Fingerprinting** (V1)
  - Subfeature: IP reputation check
  - Subfeature: Device fingerprint tracking
  - Subfeature: Multi-account detection

### Capability: Policy Enforcement
- **Feature: Platform Policies**
  - Subfeature: Policy rule registry (configurable by Super Admin)
  - Subfeature: Policy version control
  - Subfeature: Policy violation tracking
- **Feature: Sanctions**
  - Subfeature: Listing quarantine
  - Subfeature: Account suspension (manual)
  - Subfeature: Automated lockout (behavioral triggers, V1)
  - Subfeature: Permanent ban

---

## 1.10 Notifications Domain

### Capability: Real-Time Notifications
- **Feature: In-App Notifications**
  - Subfeature: Notification bell with unread count
  - Subfeature: Notification feed (paginated)
  - Subfeature: Real-time delivery (WebSocket)
  - Subfeature: Mark as read / mark all read
  - Subfeature: Notification grouping by type
- **Feature: Push Events**
  - Subfeature: Listing status changed (approved/rejected)
  - Subfeature: New inquiry received
  - Subfeature: Quota warning (80% usage)
  - Subfeature: Quota exceeded
  - Subfeature: Team invitation received
  - Subfeature: Payment processed / failed (V1)

### Capability: Email Notifications
- **Feature: Transactional Emails**
  - Subfeature: Welcome email on registration
  - Subfeature: Email verification
  - Subfeature: Magic link delivery
  - Subfeature: Listing approved/rejected notification
  - Subfeature: Invoice receipt
  - Subfeature: Team invitation email
  - Subfeature: Password reset
- **Feature: Digest Emails** (V1)
  - Subfeature: Weekly listing performance digest
  - Subfeature: Monthly analytics summary

---

## 1.11 Realtime Infrastructure Domain

### Capability: WebSocket Gateway
- **Feature: Channel Management**
  - Subfeature: `tenant_feed:<tenant_id>` — feed updates
  - Subfeature: `tenant_moderation:<tenant_id>` — moderation alerts
  - Subfeature: `tenant_notifications:<tenant_id>` — general notifications
  - Subfeature: `platform:global` — system announcements
  - Subfeature: Authenticated connection (JWT required)
- **Feature: Live Data Events**
  - Subfeature: New listing active (broadcast to feed)
  - Subfeature: Listing status changed
  - Subfeature: Quota warning push
  - Subfeature: Moderation decision push
  - Subfeature: Live view counters (V2)

---

## 1.12 Governance & Admin Domain

### Capability: Super Admin Operations
- **Feature: Platform Dashboard**
  - Subfeature: Global KPI overview (MRR, active tenants, error rates, latency)
  - Subfeature: Health status map per domain
  - Subfeature: Real-time alert feed
- **Feature: Tenant Management**
  - Subfeature: Tenant list with search and filters
  - Subfeature: Tenant detail view (plan, usage, trust score)
  - Subfeature: Tenant impersonation (read-only mode)
  - Subfeature: Plan override (manual plan assignment)
  - Subfeature: Manual suspension / reactivation
- **Feature: Platform Configuration**
  - Subfeature: Feature flag controls
  - Subfeature: System configuration overrides
  - Subfeature: Maintenance mode toggle
  - Subfeature: Platform-wide announcements
- **Feature: Schema Migrations**
  - Subfeature: Migration history viewer
  - Subfeature: Pending migration alerts
  - Subfeature: Safe migration execution (with rollback)

### Capability: Audit & Compliance
- **Feature: Audit Log**
  - Subfeature: Immutable audit trail (all admin actions)
  - Subfeature: User action logging (data access, mutations)
  - Subfeature: Log search and filter
  - Subfeature: Log export (CSV / JSON)
- **Feature: Compliance Tooling**
  - Subfeature: GDPR data subject request processing
  - Subfeature: Right to erasure (data purge)
  - Subfeature: Data export for portability
  - Subfeature: Data retention policy enforcement

### Capability: AI Governance
- **Feature: Model Management**
  - Subfeature: Model registry (available models catalog)
  - Subfeature: Model version pinning per tenant tier
  - Subfeature: Cost budget controls (global and per-tenant)
  - Subfeature: Inference kill-switch
- **Feature: AI Experiment Management**
  - Subfeature: A/B test configuration
  - Subfeature: Multi-armed bandit experiment setup
  - Subfeature: Winner declaration + rollout

### Capability: Experimentation Infrastructure
- **Feature: A/B Testing**
  - Subfeature: Experiment definition (variants, allocation %)
  - Subfeature: User cohort assignment (deterministic hash)
  - Subfeature: Variant configuration delivery
  - Subfeature: Statistical significance calculation
  - Subfeature: Experiment conclusions + winner selection
- **Feature: Multi-Armed Bandit**
  - Subfeature: Thompson Sampling allocation
  - Subfeature: Dynamic traffic reallocation to winning variants
  - Subfeature: Exploitation/exploration balance

---

# 2. ROLE INVENTORY

---

## 2.1 Super Admin

**Definition**: Internal platform operator with god-mode access to all platform systems and all tenant data.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Ensure platform health, revenue integrity, trust compliance, and system reliability |
| **Responsibilities** | Platform monitoring, tenant lifecycle management, AI governance, billing oversight, moderation oversight, security incident response |
| **Capabilities** | Full read/write across all domains; tenant impersonation; feature flag management; AI model controls; billing ledger access; audit log review |
| **Restrictions** | All actions immutably logged in audit trail; cannot delete audit logs; destructive actions require 2-person approval (V2) |
| **Permissions** | `platform:*` (all platform scopes) |
| **Primary Workflows** | Platform health dashboard → Tenant oversight → Moderation queue → Billing review → AI budget management |

---

## 2.2 Platform Operator

**Definition**: Internal staff with narrowed operational access — support engineers, trust & safety reviewers, billing administrators.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Resolve tenant support issues, review moderation queue, manage billing disputes |
| **Responsibilities** | Tier-1 tenant support, moderation review, billing reconciliation, incident response |
| **Capabilities** | Moderation queue access; tenant read-only view; billing read access; audit log read |
| **Restrictions** | Cannot impersonate tenants; cannot modify platform configs; cannot access AI model controls |
| **Permissions** | `admin:moderation:read`, `admin:moderation:write`, `admin:tenants:read`, `admin:billing:read` |
| **Primary Workflows** | Moderation queue → Review flagged content → Approve/reject; Billing dispute → Review ledger → Escalate |

---

## 2.3 Tenant Owner

**Definition**: The individual who created the organization and holds full administrative control over the tenant workspace.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Build and grow marketplace presence; manage team; control costs and performance |
| **Responsibilities** | Organization setup, billing management, team management, listing strategy, analytics review |
| **Capabilities** | Full access to tenant workspace; billing management; team management; custom domain setup; API key management |
| **Restrictions** | Cannot access other tenants' data; bound by plan limits |
| **Permissions** | `tenant:*` (all tenant-scoped scopes) |
| **Primary Workflows** | Dashboard → Listings → Team → Billing → Analytics → Settings |

---

## 2.4 Company Admin

**Definition**: Delegated admin within a tenant organization, managing operations without billing ownership.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Manage listings, team operations, and performance analytics |
| **Responsibilities** | Listing oversight, team member management, analytics review, moderation monitoring |
| **Capabilities** | Listings CRUD; team invitation/removal; analytics read; settings read |
| **Restrictions** | Cannot manage billing; cannot delete organization; cannot change Owner role |
| **Permissions** | `listings:*`, `team:manage`, `analytics:read`, `settings:read` |
| **Primary Workflows** | Listings management → Team management → Analytics review → Moderation alerts |

---

## 2.5 Branch Manager (V1)

**Definition**: Manages a sub-workspace (branch) within a larger organization.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Manage branch-specific listings and team performance |
| **Responsibilities** | Branch listing management, branch member oversight, branch analytics |
| **Capabilities** | Listings CRUD (branch-scoped); team management (branch-scoped); analytics (branch-scoped) |
| **Restrictions** | Cannot access other branches; cannot modify organization-level settings |
| **Permissions** | `branch:{branch_id}:listings:*`, `branch:{branch_id}:team:manage`, `branch:{branch_id}:analytics:read` |
| **Primary Workflows** | Branch dashboard → Listings → Team → Branch analytics |

---

## 2.6 Agent

**Definition**: A marketplace participant who manages listings, handles buyer inquiries, and drives leads.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Create high-quality listings; handle buyer inquiries; close leads; track personal performance |
| **Responsibilities** | Listing creation and management, lead handling, performance tracking, profile maintenance |
| **Capabilities** | Own listings CRUD; inquiry management; personal analytics; messaging |
| **Restrictions** | Cannot manage other agents' listings (unless delegated); cannot access billing; cannot change team roles |
| **Permissions** | `listings:own:*`, `inquiries:own:*`, `analytics:own:read`, `profile:write` |
| **Primary Workflows** | Create listing → Publish → Handle inquiry → Close lead → Review performance |

---

## 2.7 Sales Representative

**Definition**: Focused on lead conversion and relationship management rather than listing creation.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Convert leads to closed deals; manage buyer relationships; track pipeline |
| **Responsibilities** | Lead management, buyer communication, pipeline tracking, conversion reporting |
| **Capabilities** | Inquiry read/respond; lead status updates; pipeline view; messaging |
| **Restrictions** | Cannot create listings; cannot access billing; cannot manage team |
| **Permissions** | `inquiries:read`, `inquiries:respond`, `leads:manage`, `messages:*` |
| **Primary Workflows** | Lead inbox → Contact buyer → Update lead status → Track conversion |

---

## 2.8 Content Moderator (Internal)

**Definition**: Internal reviewer who handles the human-review queue for borderline content.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Accurately review flagged content; maintain platform quality; meet SLA targets |
| **Responsibilities** | Review moderation queue; approve/reject listings; escalate complex cases |
| **Capabilities** | Moderation queue access; approve/reject/escalate actions; moderation notes |
| **Restrictions** | Cannot access billing; cannot manage tenants; cannot modify platform config |
| **Permissions** | `moderation:queue:read`, `moderation:queue:write`, `moderation:escalate` |
| **Primary Workflows** | Moderation queue → Review content → Decision → Note → Next item |

---

## 2.9 Buyer

**Definition**: A marketplace visitor or authenticated user who searches, discovers, and initiates contact with sellers.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Find relevant listings; compare options; contact sellers; complete transactions |
| **Responsibilities** | Search and discovery, listing evaluation, inquiry submission, review submission (V2) |
| **Capabilities** | Search; browse categories; view listing detail; submit inquiry; save favorites; write reviews (V2) |
| **Restrictions** | Cannot create listings without switching to seller role; cannot access tenant dashboards |
| **Permissions** | `marketplace:read`, `inquiries:create`, `reviews:create` (V2) |
| **Primary Workflows** | Land → Search/Browse → Discover → View listing → Submit inquiry |

---

## 2.10 Seller

**Definition**: A tenant-registered user who creates and manages listings to attract buyers.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Maximize listing visibility; attract quality leads; grow marketplace presence |
| **Responsibilities** | Listing creation and optimization, media management, inquiry response, performance tracking |
| **Capabilities** | All Agent capabilities + advanced listing features |
| **Restrictions** | Bound by tenant plan limits |
| **Permissions** | Inherits Agent permissions + `listings:media:*`, `listings:bulk:*` |
| **Primary Workflows** | Register → Onboard → Create listings → Publish → Manage leads → Analyze performance |

---

## 2.11 Visitor (Anonymous)

**Definition**: An unauthenticated user exploring the public marketplace.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Discover listings; evaluate platform; decide whether to register |
| **Responsibilities** | None |
| **Capabilities** | Public search; category browsing; listing detail view (with contact gate); pricing page |
| **Restrictions** | Cannot submit inquiries without registration; cannot save favorites; gets non-personalized feed |
| **Permissions** | `marketplace:read:public` |
| **Primary Workflows** | Land on homepage → Search or browse → View listing → Register to contact |

---

## 2.12 AI Operator

**Definition**: Internal ML engineer or AI product manager managing the AI infrastructure and model behaviors.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Optimize AI system performance; manage model costs; govern AI experiments |
| **Responsibilities** | Model registry management, token budget configuration, AI experiment management, re-ranker quality monitoring |
| **Capabilities** | Model registry CRUD; budget configuration; AI experiment setup; AI analytics read; inference kill-switch |
| **Restrictions** | Cannot access tenant operational data; cannot modify billing plans; cannot access audit logs |
| **Permissions** | `admin:ai:*`, `admin:experiments:*`, `admin:analytics:ai:read` |
| **Primary Workflows** | AI dashboard → Model registry → Budget controls → Experiment setup → Quality metrics |

---

## 2.13 Analytics Manager

**Definition**: Internal data analyst or analytics product manager overseeing platform and tenant analytics.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Provide actionable insights to Product and business leadership; track platform health KPIs |
| **Responsibilities** | KPI reporting, funnel analysis, cohort analysis, experiment outcome measurement, executive reporting |
| **Capabilities** | Full analytics read; funnel builder; cohort tools; export capabilities; experiment results |
| **Restrictions** | No write access to any operational system; read-only across all domains |
| **Permissions** | `analytics:*:read`, `experiments:results:read` |
| **Primary Workflows** | KPI dashboard → Funnel analysis → Cohort review → Experiment results → Executive report |

---

## 2.14 Billing Manager

**Definition**: Internal finance team member managing platform revenue and billing operations.

| Attribute | Definition |
|:----------|:-----------|
| **Goals** | Ensure billing accuracy; reconcile revenue; manage disputes; produce financial reports |
| **Responsibilities** | Ledger review, invoice management, Stripe reconciliation, overage dispute handling, revenue reporting |
| **Capabilities** | Full billing ledger read; invoice management; Stripe sync tools; revenue reports; refund initiation |
| **Restrictions** | Cannot access listing data; cannot manage tenants; cannot modify AI settings |
| **Permissions** | `admin:billing:*`, `admin:ledger:read`, `admin:revenue:read` |
| **Primary Workflows** | Billing dashboard → Ledger review → Invoice management → Revenue reporting → Dispute resolution |

---

# 3. FEATURE INVENTORY

---

## 3.1 Identity & Authentication Features

### F-AUTH-001: Email/Password Registration
| Attribute | Value |
|:----------|:------|
| **Purpose** | Allow users to create accounts using email and password |
| **Business Value** | Primary user acquisition channel; enables tenant provisioning |
| **User Value** | Quick account creation without third-party dependency |
| **Dependencies** | Email verification service, JWT issuer |
| **Owner Domain** | Identity |
| **Related Events** | `identity.user_registered`, `identity.session_started` |
| **Related Analytics** | Registration funnel conversion rate, registration source attribution |
| **Related Permissions** | None (public endpoint) |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-AUTH-002: Google OAuth Login
| Attribute | Value |
|:----------|:------|
| **Purpose** | Reduce registration friction via Google account federation |
| **Business Value** | Higher conversion rate; lower support burden (no password resets) |
| **User Value** | One-click login with trusted provider |
| **Dependencies** | Google OAuth 2.0 PKCE, JWT issuer |
| **Owner Domain** | Identity |
| **Related Events** | `identity.user_registered`, `identity.session_started` |
| **Related Analytics** | OAuth vs. email split, OAuth conversion rate |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-AUTH-003: Multi-Factor Authentication (MFA)
| Attribute | Value |
|:----------|:------|
| **Purpose** | Add second authentication factor to prevent account takeover |
| **Business Value** | Reduces fraud; enables enterprise compliance (SOC 2) |
| **User Value** | Account security assurance |
| **Dependencies** | TOTP library, MFA enrollment flow |
| **Owner Domain** | Identity |
| **Related Events** | `identity.mfa_enrolled` |
| **Related Analytics** | MFA adoption rate, account takeover incident rate |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-AUTH-004: SSO / SAML Enterprise Login
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enterprise identity provider federation for large tenant organizations |
| **Business Value** | Unlocks enterprise sales; required for $10K+ deals |
| **User Value** | Unified organizational login; no separate credentials |
| **Dependencies** | SAML 2.0 library, Identity Provider connectors |
| **Owner Domain** | Identity |
| **Related Events** | `identity.session_started` |
| **Related Analytics** | Enterprise adoption rate |
| **Priority** | P2 |
| **MVP** | ❌ No (V2) |

### F-AUTH-005: API Key Management
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enable programmatic platform access for integrations and automation |
| **Business Value** | Unlocks developer ecosystem; enables V3 partner API |
| **User Value** | Automate listing management and analytics without UI |
| **Dependencies** | JWT signing, scope system |
| **Owner Domain** | Identity |
| **Related Events** | `identity.api_key_created`, `identity.api_key_revoked` |
| **Related Analytics** | API key usage rate, API consumption metrics |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

---

## 3.2 Marketplace Features

### F-MKT-001: Listing Creation
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enable sellers to create supply-side marketplace assets |
| **Business Value** | Core supply-side growth driver; more listings = more search candidates |
| **User Value** | Platform presence; buyer discovery; lead generation |
| **Dependencies** | Trust scan (async), Embedding generation (async), S3 media storage |
| **Owner Domain** | Marketplace |
| **Related Events** | `marketplace.listing_created`, `trust.content_quarantined/approved`, `ai.embedding_generated` |
| **Related Analytics** | Listings created per day, time-to-active, category distribution |
| **Related Permissions** | `listings:create` |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-MKT-002: Listing Status Workflow
| Attribute | Value |
|:----------|:------|
| **Purpose** | Manage listing lifecycle from draft to live to archived |
| **Business Value** | Quality control; trust enforcement; supply freshness |
| **User Value** | Transparency into listing state; actionable feedback |
| **Dependencies** | Trust & Safety domain, moderation queue |
| **Owner Domain** | Marketplace |
| **Related Events** | `marketplace.listing_status_changed` |
| **Related Analytics** | Status transition rates, time in review, rejection reasons |
| **Related Permissions** | `listings:status:write` (admin), `listings:own:status:read` (seller) |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-MKT-003: Bulk Listing Import
| Attribute | Value |
|:----------|:------|
| **Purpose** | Allow rapid catalog population via CSV/Excel upload |
| **Business Value** | Reduces time-to-list for data-rich tenants; faster onboarding |
| **User Value** | Eliminate manual entry for large catalogs |
| **Dependencies** | CSV parsing, batch embedding generation, batch trust scanning |
| **Owner Domain** | Marketplace |
| **Related Events** | `marketplace.listing_created` (×N) |
| **Related Analytics** | Import success rate, import error breakdown |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-MKT-004: Reviews & Ratings
| Attribute | Value |
|:----------|:------|
| **Purpose** | Build trust through verified buyer feedback |
| **Business Value** | Increases conversion rates; creates network effects; trust signals for ranking |
| **User Value** | Informed purchase decisions |
| **Dependencies** | Transaction verification system, moderation for reviews |
| **Owner Domain** | Marketplace |
| **Related Events** | `marketplace.review_created`, `trust.trust_score_updated` |
| **Related Analytics** | Average review score, review volume per listing, review-to-conversion correlation |
| **Priority** | P2 |
| **MVP** | ❌ No (V2) |

---

## 3.3 Discovery Features

### F-DISC-001: Semantic Vector Search
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enable natural-language discovery of relevant listings |
| **Business Value** | Core platform differentiator; 2× better relevance than keyword search |
| **User Value** | Find what you need without knowing exact keywords |
| **Dependencies** | pgvector HNSW index, embedding generation, Redis preference cache |
| **Owner Domain** | Discovery |
| **Related Events** | `discovery.search_executed`, `discovery.feed_generated` |
| **Related Analytics** | Search CTR, zero-results rate, query distribution, relevance score |
| **Related Permissions** | `search:execute` (public) |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-DISC-002: Personalized Feed
| Attribute | Value |
|:----------|:------|
| **Purpose** | Serve a uniquely relevant homepage feed to each user |
| **Business Value** | Higher engagement; lower bounce rates; stronger retention |
| **User Value** | Discover listings matching my specific interests automatically |
| **Dependencies** | User preference vectors, Redis cache, Stage 1-3 pipeline |
| **Owner Domain** | Discovery |
| **Related Events** | `discovery.feed_generated`, `analytics.recommendation_served` |
| **Related Analytics** | Feed CTR, session depth, feed personalization lift vs. cold |
| **Priority** | P0 (basic), P1 (personalized) |
| **MVP** | ✅ Basic (non-personalized trending), V1 for personalized |

### F-DISC-003: Neural Re-Ranking (Stage 3)
| Attribute | Value |
|:----------|:------|
| **Purpose** | Apply machine-learning re-ranking for maximum discovery relevance |
| **Business Value** | NDCG@10 ≥ 0.75 target; significant CTR improvement |
| **User Value** | Most relevant results at the top, every time |
| **Dependencies** | Behavioral training data (requires MVP data), XGBoost model, Stage 1-2 pipeline |
| **Owner Domain** | Discovery |
| **Related Events** | `discovery.ranking_completed` |
| **Related Analytics** | NDCG@10, precision@5, ranking model drift detection |
| **Priority** | P1 |
| **MVP** | ❌ No (V1 — needs MVP data first) |

### F-DISC-004: Faceted Filtering
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enable users to narrow search results by structured criteria |
| **Business Value** | Reduces irrelevant impressions; improves lead quality |
| **User Value** | Precise control over search results |
| **Dependencies** | Listing metadata schema, filter state management |
| **Owner Domain** | Discovery |
| **Related Events** | `discovery.search_executed` (with filter metadata) |
| **Related Analytics** | Filter usage frequency, filter → click conversion |
| **Priority** | P0 |
| **MVP** | ✅ Yes (category, price, tags) |

### F-DISC-005: Typeahead Suggestions
| Attribute | Value |
|:----------|:------|
| **Purpose** | Reduce search friction with real-time query suggestions |
| **Business Value** | Higher search engagement; guides users to indexed terms |
| **User Value** | Faster query composition; spelling error prevention |
| **Dependencies** | Search index, debounced API calls |
| **Owner Domain** | Discovery |
| **Related Events** | `discovery.suggestion_requested` |
| **Related Analytics** | Suggestion acceptance rate, suggestion→query conversion |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

---

## 3.4 AI Features

### F-AI-001: Listing Embedding Generation
| Attribute | Value |
|:----------|:------|
| **Purpose** | Transform listing content into vectors for semantic search |
| **Business Value** | Enables entire discovery pipeline; foundational AI feature |
| **User Value** | Listings become discoverable via natural language |
| **Dependencies** | OpenAI text-embedding-3-small API, pgvector, background job queue |
| **Owner Domain** | AI Infrastructure |
| **Related Events** | `ai.embedding_generated` |
| **Related Analytics** | Embedding generation latency, queue depth, failure rate |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-AI-002: Content Moderation Scan
| Attribute | Value |
|:----------|:------|
| **Purpose** | Automatically screen listing content for policy violations |
| **Business Value** | ≥ 90% automation of trust decisions; reduces human reviewer cost |
| **User Value** | Fast approval for legitimate listings; platform safety |
| **Dependencies** | GPT-4o-mini, trust scoring model, moderation queue |
| **Owner Domain** | Trust & Safety + AI Infrastructure |
| **Related Events** | `trust.content_quarantined`, `trust.content_approved`, `trust.fraud_detected` |
| **Related Analytics** | Moderation recall rate, false positive rate, review SLA |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-AI-003: Semantic Prompt Cache
| Attribute | Value |
|:----------|:------|
| **Purpose** | Cache LLM responses for similar queries to reduce cost and latency |
| **Business Value** | 60%+ cache hit rate → 40-60% LLM cost reduction |
| **User Value** | Faster AI response times |
| **Dependencies** | Redis, embedding similarity (cosine ≥ 0.96), LLM inference |
| **Owner Domain** | AI Infrastructure |
| **Related Events** | `ai.cache_hit`, `ai.cache_miss` |
| **Related Analytics** | Cache hit rate, cost savings per day, latency impact |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-AI-004: Listing Enrichment Suggestions
| Attribute | Value |
|:----------|:------|
| **Purpose** | AI-powered quality improvement recommendations for sellers |
| **Business Value** | Better listing quality → higher CTR → more leads |
| **User Value** | Guided optimization without marketing expertise |
| **Dependencies** | LLM inference, listing quality scoring model |
| **Owner Domain** | AI Infrastructure + Marketplace |
| **Related Events** | `ai.enrichment_suggested` |
| **Related Analytics** | Suggestion acceptance rate, listing quality score improvement |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

---

## 3.5 Analytics Features

### F-ANL-001: Listing Performance Dashboard
| Attribute | Value |
|:----------|:------|
| **Purpose** | Give sellers visibility into listing-level engagement metrics |
| **Business Value** | Retains tenants; demonstrates platform value |
| **User Value** | Understand which listings perform and why |
| **Dependencies** | ClickHouse, clickstream events, Kafka |
| **Owner Domain** | Analytics |
| **Related Events** | `discovery.item_impressed`, `discovery.item_clicked` |
| **Related Permissions** | `analytics:listings:read` |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-ANL-002: AI Token Usage Dashboard
| Attribute | Value |
|:----------|:------|
| **Purpose** | Provide real-time visibility into AI credit consumption |
| **Business Value** | Reduces support volume; enables self-service quota management |
| **User Value** | Know when approaching limits; plan usage accordingly |
| **Dependencies** | Usage ledger, billing metering |
| **Owner Domain** | Analytics + Monetization |
| **Related Events** | `monetization.event_recorded`, `monetization.quota_exceeded` |
| **Related Permissions** | `analytics:ai:read` |
| **Priority** | P0 |
| **MVP** | ✅ Yes (basic meter) |

### F-ANL-003: Conversion Funnel Analysis
| Attribute | Value |
|:----------|:------|
| **Purpose** | Track user journey from discovery to lead submission |
| **Business Value** | Identifies drop-off points; guides product optimization |
| **User Value** | Sellers understand buyer journey on their listings |
| **Dependencies** | ClickHouse windowFunnel, Kafka events, session tracking |
| **Owner Domain** | Analytics |
| **Related Events** | Full clickstream event chain |
| **Related Permissions** | `analytics:funnel:read` |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

---

## 3.6 Billing Features

### F-BILL-001: Subscription Management
| Attribute | Value |
|:----------|:------|
| **Purpose** | Manage tenant subscription lifecycle (create, upgrade, cancel) |
| **Business Value** | Recurring revenue foundation |
| **User Value** | Predictable costs; self-service plan management |
| **Dependencies** | Stripe integration, plan catalog, quota enforcement |
| **Owner Domain** | Monetization |
| **Related Events** | `monetization.subscription_changed` |
| **Related Permissions** | `billing:subscriptions:manage` |
| **Priority** | P1 |
| **MVP** | ❌ No (V1 — manual billing in MVP) |

### F-BILL-002: Usage-Based AI Billing
| Attribute | Value |
|:----------|:------|
| **Purpose** | Meter and bill AI token consumption beyond plan limits |
| **Business Value** | Revenue growth from high-usage tenants; aligns cost with value |
| **User Value** | Pay only for what you use |
| **Dependencies** | Token metering, Stripe metered billing, usage ledger |
| **Owner Domain** | Monetization |
| **Related Events** | `monetization.event_recorded`, `monetization.invoice_generated` |
| **Related Permissions** | `billing:usage:read` |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-BILL-003: Sponsored Listing Ad Campaigns
| Attribute | Value |
|:----------|:------|
| **Purpose** | Allow tenants to pay for promoted placement in discovery feed |
| **Business Value** | Additional revenue stream beyond subscriptions |
| **User Value** | Increased listing visibility and leads |
| **Dependencies** | Ad auction engine, ranking Stage 2 boost integration |
| **Owner Domain** | Monetization |
| **Related Events** | `monetization.ad_auction_completed` |
| **Related Permissions** | `ads:campaigns:manage` |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

---

## 3.7 Trust & Safety Features

### F-TRUST-001: Pre-Publish Content Scan
| Attribute | Value |
|:----------|:------|
| **Purpose** | Block policy-violating content before reaching live marketplace |
| **Business Value** | Platform integrity; regulatory compliance; advertiser safety |
| **User Value** | Safer marketplace experience |
| **Dependencies** | LLM moderation API, quarantine workflow |
| **Owner Domain** | Trust & Safety |
| **Related Events** | `trust.content_quarantined`, `trust.content_approved` |
| **Related Permissions** | System (automated) |
| **Priority** | P0 |
| **MVP** | ✅ Yes |

### F-TRUST-002: Trust Score System
| Attribute | Value |
|:----------|:------|
| **Purpose** | Quantify tenant/seller trustworthiness for ranking and access control |
| **Business Value** | Penalizes bad actors; rewards good actors; marketplace quality signal |
| **User Value** | Trust badge visibility; ranking boost for trusted sellers |
| **Dependencies** | Moderation history, behavioral data, trust scoring model |
| **Owner Domain** | Trust & Safety |
| **Related Events** | `trust.trust_score_updated` |
| **Related Permissions** | `trust:scores:read` (admin), visible to sellers as their own score |
| **Priority** | P0 |
| **MVP** | ✅ Yes (basic) |

### F-TRUST-003: Behavioral Anomaly Detection
| Attribute | Value |
|:----------|:------|
| **Purpose** | Detect and respond to suspicious behavioral patterns in real time |
| **Business Value** | Reduces fraud; protects marketplace integrity |
| **User Value** | Safer marketplace; reduced fake listings |
| **Dependencies** | Redis sliding windows, behavioral event stream, alert system |
| **Owner Domain** | Trust & Safety |
| **Related Events** | `trust.fraud_detected` |
| **Related Permissions** | System (automated) |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

### F-TRUST-004: Appeals System
| Attribute | Value |
|:----------|:------|
| **Purpose** | Allow sellers to contest moderation decisions |
| **Business Value** | Reduces false positive impact; improves seller satisfaction |
| **User Value** | Due process for legitimate sellers |
| **Dependencies** | Moderation workflow, reviewer assignment |
| **Owner Domain** | Trust & Safety |
| **Related Events** | `trust.appeal_created`, `trust.appeal_resolved` |
| **Related Permissions** | `trust:appeals:create` (seller), `trust:appeals:resolve` (moderator) |
| **Priority** | P1 |
| **MVP** | ❌ No (V1) |

---

# 4. SCREEN INVENTORY

---

## 4.1 Public Marketplace Screens

### SCR-PUB-001: Platform Landing Page
| Attribute | Value |
|:----------|:------|
| **Purpose** | Marketing and discovery entry point; SEO-optimized for organic traffic |
| **Role Access** | Visitor, Buyer, all authenticated users |
| **Required Data** | Trending listings (top-20), platform statistics, categories |
| **Actions** | Search, browse categories, navigate to pricing, navigate to login/register |
| **Dependencies** | Discovery API (non-personalized trending feed), Category API |
| **Analytics** | Page view, search query initiated, CTA clicks, scroll depth |
| **Permissions** | None (public) |
| **Navigation** | → Search Results, → Listing Detail, → Pricing, → Login, → Register |

### SCR-PUB-002: Public Marketplace / Category Browse
| Attribute | Value |
|:----------|:------|
| **Purpose** | SEO-indexed listing grid for category browsing and organic discovery |
| **Role Access** | Visitor, Buyer |
| **Required Data** | Category listings (paginated, top-25), category metadata, filter options |
| **Actions** | Filter, sort, view listing, paginate, switch view mode |
| **Dependencies** | Discovery API, Category API |
| **Analytics** | Category page view, filter usage, listing click, scroll depth, zero-results |
| **Permissions** | None (public) |
| **Navigation** | → Listing Detail, → Search, → Login (to contact seller) |

### SCR-PUB-003: Listing Detail Page
| Attribute | Value |
|:----------|:------|
| **Purpose** | Authoritative listing page for buyers to evaluate and contact sellers |
| **Role Access** | Visitor (view only), Buyer (contact), Seller (edit own) |
| **Required Data** | Full listing metadata, media gallery, seller profile, similar listings, reviews (V2) |
| **Actions** | View gallery, read description, submit inquiry (authenticated only), share, save (V1), report |
| **Dependencies** | Marketplace API, Discovery API (similar listings), S3 CDN (media) |
| **Analytics** | Page view, time-on-page, gallery interaction, inquiry submission, share event |
| **Permissions** | `marketplace:read` (public), `inquiries:create` (authenticated) |
| **Navigation** | → Inquiry form, → Seller Profile, → Similar listings, → Login |

### SCR-PUB-004: Search Results Page
| Attribute | Value |
|:----------|:------|
| **Purpose** | Display search results with filters, sorting, and pagination |
| **Role Access** | Visitor, Buyer |
| **Required Data** | Search results (vector + keyword hybrid), total count, filter facets |
| **Actions** | Refine query, apply filters, sort, click listing, paginate |
| **Dependencies** | Discovery/Search API, Filter state management |
| **Analytics** | Query logged, result count, CTR per result position, filter applied |
| **Permissions** | None (public) |
| **Navigation** | → Listing Detail, → Category Browse |

### SCR-PUB-005: Pricing Page
| Attribute | Value |
|:----------|:------|
| **Purpose** | Transparent plan comparison to drive signup conversion |
| **Role Access** | Visitor, Buyer |
| **Required Data** | Plan catalog (Starter, Growth, Enterprise), feature comparison matrix |
| **Actions** | Select plan, navigate to register, contact sales (Enterprise) |
| **Dependencies** | Billing API (plan catalog) |
| **Analytics** | Page view, plan click, FAQ expansion, CTA conversion |
| **Permissions** | None (public) |
| **Navigation** | → Register (with plan pre-selected) |

---

## 4.2 Authentication Screens

### SCR-AUTH-001: Login
| Attribute | Value |
|:----------|:------|
| **Purpose** | Authenticate returning users and initiate sessions |
| **Role Access** | All unauthenticated users |
| **Required Data** | None |
| **Actions** | Email/password login, Google OAuth, magic link request, forgot password |
| **Dependencies** | Identity API |
| **Analytics** | Login method split, success/failure rate, auth errors |
| **Permissions** | None (public) |
| **Navigation** | → Dashboard (on success), → Register, → Forgot Password |

### SCR-AUTH-002: Register / Onboarding
| Attribute | Value |
|:----------|:------|
| **Purpose** | New user registration with org creation onboarding flow |
| **Role Access** | Visitor |
| **Required Data** | None |
| **Actions** | Step 1: Account creation; Step 2: Org setup; Step 3: Plan selection; Step 4: Confirmation |
| **Dependencies** | Identity API, Tenant API, Billing API |
| **Analytics** | Funnel step completion, drop-off per step, registration source, plan selected |
| **Permissions** | None (public) |
| **Navigation** | → Dashboard (on completion) |

### SCR-AUTH-003: Forgot Password / Reset
| Attribute | Value |
|:----------|:------|
| **Purpose** | Recover account access via email-verified password reset |
| **Role Access** | All unauthenticated users |
| **Required Data** | None |
| **Actions** | Submit email → receive link → set new password |
| **Dependencies** | Identity API, Email service |
| **Analytics** | Reset initiated rate, link click rate, completion rate |
| **Permissions** | None (public) |
| **Navigation** | → Login |

### SCR-AUTH-004: MFA Setup / Verification (V1)
| Attribute | Value |
|:----------|:------|
| **Purpose** | Enroll and verify second authentication factor |
| **Role Access** | Authenticated users |
| **Required Data** | User session |
| **Actions** | Scan QR code, enter TOTP code, save recovery codes |
| **Dependencies** | Identity API (MFA enrollment endpoint) |
| **Analytics** | MFA enrollment rate, MFA verification success/failure |
| **Permissions** | `auth:mfa:enroll` |
| **Navigation** | → Settings → Security |

---

## 4.3 Tenant Dashboard Screens

### SCR-DASH-001: Overview Dashboard
| Attribute | Value |
|:----------|:------|
| **Purpose** | Primary tenant command center with KPIs and activity feed |
| **Role Access** | Owner, Admin, Member |
| **Required Data** | Active listings count, total impressions, total inquiries, AI token usage %, recent activity |
| **Actions** | Quick-create listing, view analytics, manage team, navigate to billing |
| **Dependencies** | Analytics API, Listing API, Billing API, Realtime (WebSocket) |
| **Analytics** | Dashboard visit, widget interaction, quick-action clicks |
| **Permissions** | `dashboard:read` |
| **Navigation** | → Listings, → Analytics, → Team, → Billing, → Settings |

### SCR-DASH-002: Listing Management
| Attribute | Value |
|:----------|:------|
| **Purpose** | Full CRUD listing management with status tracking |
| **Role Access** | Owner, Admin, Agent (own only), Member (view) |
| **Required Data** | Listing list (paginated, filterable by status), per-listing: status, views, inquiries |
| **Actions** | Create listing, edit listing, change status, duplicate, delete, bulk operations (V1) |
| **Dependencies** | Listing API, Media API |
| **Analytics** | Listing management page views, create button clicks, bulk actions used |
| **Permissions** | `listings:read`, `listings:write`, `listings:delete` |
| **Navigation** | → Listing Create/Edit, → Listing Detail |

### SCR-DASH-003: Listing Create / Edit
| Attribute | Value |
|:----------|:------|
| **Purpose** | Rich listing editor with AI-assisted optimization suggestions |
| **Role Access** | Owner, Admin, Agent |
| **Required Data** | Category tree, existing listing data (edit mode), AI suggestions (V1) |
| **Actions** | Edit all fields, upload media, set price, assign category/tags, preview, submit |
| **Dependencies** | Listing API, Category API, Media API, AI enrichment API (V1) |
| **Analytics** | Editor time-spent, field completion rates, submit vs. save-draft split |
| **Permissions** | `listings:create`, `listings:edit` |
| **Navigation** | → Listing Management (on save/submit) |

### SCR-DASH-004: Analytics Dashboard (V1)
| Attribute | Value |
|:----------|:------|
| **Purpose** | Comprehensive performance insights for tenant engagement and growth |
| **Role Access** | Owner, Admin, Analytics Manager role |
| **Required Data** | 8 analytics panels: views, CTR, leads, conversion, token usage, discovery metrics, trend charts |
| **Actions** | Date range filter, export CSV, drill-down to listing-level |
| **Dependencies** | Analytics API (ClickHouse queries), Billing API (token usage) |
| **Analytics** | Dashboard visits, export clicks, drill-down navigation |
| **Permissions** | `analytics:read` |
| **Navigation** | → Listing Management (from drill-down) |

### SCR-DASH-005: Team Management
| Attribute | Value |
|:----------|:------|
| **Purpose** | Manage organization members, roles, and invitations |
| **Role Access** | Owner, Admin |
| **Required Data** | Member list (with roles, last active), pending invitations, available seats |
| **Actions** | Invite member, change role, remove member, resend invitation, cancel invitation |
| **Dependencies** | Tenant API (member management), Identity API |
| **Analytics** | Team page views, invitations sent, role changes |
| **Permissions** | `team:manage` |
| **Navigation** | → Member Detail (V2) |

### SCR-DASH-006: Billing & Subscription
| Attribute | Value |
|:----------|:------|
| **Purpose** | Manage subscription, view invoices, and track AI credit usage |
| **Role Access** | Owner (billing management), Admin (view only) |
| **Required Data** | Current plan, billing cycle, invoice history, current usage meters |
| **Actions** | Upgrade plan, manage payment method (Stripe Portal), view invoices, download invoice PDF, top-up credits |
| **Dependencies** | Billing API, Stripe Billing Portal |
| **Analytics** | Billing page visits, upgrade click, portal session start |
| **Permissions** | `billing:read`, `billing:manage` (Owner only) |
| **Navigation** | → Pricing (plan comparison) |

### SCR-DASH-007: Messages / Inquiries
| Attribute | Value |
|:----------|:------|
| **Purpose** | Centralized inbox for buyer inquiries and inter-team messaging |
| **Role Access** | Owner, Admin, Agent, Sales Rep |
| **Required Data** | Inbox (unread first), conversation threads, buyer profile context |
| **Actions** | Read message, reply, assign to agent, mark resolved, filter by status |
| **Dependencies** | Messaging API, Realtime (WebSocket), Listing API |
| **Analytics** | Response time, resolution rate, inquiry volume |
| **Permissions** | `messages:read`, `messages:reply` |
| **Navigation** | → Listing Detail (context), → Contact Buyer |

### SCR-DASH-008: Settings
| Attribute | Value |
|:----------|:------|
| **Purpose** | Workspace configuration and security management |
| **Role Access** | Owner (all), Admin (partial) |
| **Required Data** | Org profile, custom domain (V1), API keys (V1), notification preferences, security settings |
| **Actions** | Edit org profile, configure domain (V1), generate/revoke API keys (V1), configure webhooks (V1) |
| **Dependencies** | Tenant API, Identity API (API key management) |
| **Analytics** | Settings page visits, settings saved events |
| **Permissions** | `settings:read`, `settings:write` (Owner only) |
| **Navigation** | → Custom Domain Setup, → API Keys |

### SCR-DASH-009: AI & Customization (V2)
| Attribute | Value |
|:----------|:------|
| **Purpose** | Configure tenant-specific AI behaviors and white-label appearance |
| **Role Access** | Owner, Admin |
| **Required Data** | White-label config, AI model preferences, discovery weight customization |
| **Actions** | Set brand colors, upload logo, configure custom AI instructions |
| **Dependencies** | Tenant API, AI Gateway API |
| **Analytics** | Customization feature adoption |
| **Permissions** | `settings:branding:write`, `settings:ai:write` |

---

## 4.4 Super Admin Console Screens

### SCR-ADMIN-001: Global Platform Dashboard
| Attribute | Value |
|:----------|:------|
| **Purpose** | Real-time platform health and business KPI overview |
| **Role Access** | Super Admin, Platform Operator (read-only) |
| **Required Data** | Total MRR, active tenants, error rates, P95 latency, active WebSocket connections, moderation queue depth |
| **Actions** | Navigate to tenant detail, navigate to moderation, trigger maintenance mode |
| **Dependencies** | Governance API, Analytics API, Observability API |
| **Analytics** | Dashboard visit, alert interaction |
| **Permissions** | `admin:dashboard:read` |
| **Navigation** | → Tenant Management, → Moderation, → AI Control, → Billing |

### SCR-ADMIN-002: Tenant Management
| Attribute | Value |
|:----------|:------|
| **Purpose** | Oversight and control of all tenant workspaces |
| **Role Access** | Super Admin |
| **Required Data** | Tenant list (paginated, searchable), per-tenant: plan, status, trust score, MRR, listing count |
| **Actions** | View tenant detail, impersonate (read-only), suspend, reactivate, override plan, view audit log |
| **Dependencies** | Governance API, Tenant API, Trust API, Billing API |
| **Analytics** | Tenant list visits, impersonation sessions, suspension events |
| **Permissions** | `admin:tenants:*` |
| **Navigation** | → Tenant Detail, → Billing Detail, → Trust Detail |

### SCR-ADMIN-003: Moderation Queue
| Attribute | Value |
|:----------|:------|
| **Purpose** | Human review workflow for borderline-flagged content |
| **Role Access** | Super Admin, Content Moderator, Platform Operator |
| **Required Data** | Queued items (sorted by risk score), per-item: content, AI score, flagging reasons, seller profile |
| **Actions** | Approve, reject, escalate, add moderation note, bulk process |
| **Dependencies** | Trust API, Moderation queue service, Realtime (new item push) |
| **Analytics** | Queue depth, review throughput, SLA compliance rate, decision distribution |
| **Permissions** | `admin:moderation:*` |
| **Navigation** | → Listing Detail (preview), → Tenant Detail |

### SCR-ADMIN-004: AI Control Center
| Attribute | Value |
|:----------|:------|
| **Purpose** | Manage AI models, token budgets, and discovery experiments |
| **Role Access** | Super Admin, AI Operator |
| **Required Data** | Model registry, global token usage, budget utilization, active experiments |
| **Actions** | Enable/disable models, set global budgets, configure per-tenant overrides, manage A/B experiments |
| **Dependencies** | AI Gateway API, Governance API, Experimentation API |
| **Analytics** | AI cost per day, cache hit rate, experiment performance |
| **Permissions** | `admin:ai:*` |
| **Navigation** | → Experiment Detail |

### SCR-ADMIN-005: Platform Billing Ledger
| Attribute | Value |
|:----------|:------|
| **Purpose** | Full financial oversight: revenue, invoices, ledger entries |
| **Role Access** | Super Admin, Billing Manager |
| **Required Data** | Total MRR, invoice list, ledger entries, Stripe sync status, overage billing |
| **Actions** | View invoice detail, issue refund, force Stripe sync, export CSV |
| **Dependencies** | Billing API (full access), Stripe Admin API |
| **Analytics** | Revenue by plan, churn metrics, ledger anomalies |
| **Permissions** | `admin:billing:*` |
| **Navigation** | → Invoice Detail, → Tenant Billing History |

### SCR-ADMIN-006: Platform Settings & Configuration
| Attribute | Value |
|:----------|:------|
| **Purpose** | Global platform configuration, feature flags, and maintenance control |
| **Role Access** | Super Admin only |
| **Required Data** | Feature flag states, system configs, pending migrations, announcement history |
| **Actions** | Toggle feature flags, modify system config, broadcast announcement, trigger migration, enable maintenance mode |
| **Dependencies** | Governance API |
| **Analytics** | Config change events (all in audit log) |
| **Permissions** | `admin:config:*` |
| **Navigation** | → Audit Log |

### SCR-ADMIN-007: Audit Log
| Attribute | Value |
|:----------|:------|
| **Purpose** | Immutable compliance trail of all admin and user actions |
| **Role Access** | Super Admin |
| **Required Data** | Audit log entries (chronological, searchable by actor/action/resource) |
| **Actions** | Search, filter by date/actor/action, export JSON/CSV |
| **Dependencies** | Governance API (audit log endpoint) |
| **Analytics** | N/A (this IS the audit trail) |
| **Permissions** | `admin:audit:read` |

---

## 4.5 Mobile / Responsive Screens

All screens above are responsive-first. Mobile-specific considerations:
- **SCR-PUB-001 to 004**: Full mobile experience, touch-optimized
- **SCR-DASH-002**: Swipe-to-action on listing cards (V2)
- **SCR-DASH-007**: Mobile-native message thread view
- **Progressive Web App (V2)**: Offline-capable, installable

---

# 5. NAVIGATION ARCHITECTURE

---

## 5.1 Public Navigation

```
Platform Logo/Name
├── [Search Bar — Global, Prominent]
├── Marketplace (→ SCR-PUB-002)
├── Pricing (→ SCR-PUB-005)
├── Login (→ SCR-AUTH-001)
└── Get Started / Register (CTA) (→ SCR-AUTH-002)
```

**Rules**:
- Always visible on public pages
- Search bar is the primary action, center-aligned on desktop
- Mobile: collapses to hamburger + search icon

---

## 5.2 Authenticated Tenant Navigation

```
Sidebar (Desktop) / Bottom Tab (Mobile):
├── Overview [icon: home] (→ SCR-DASH-001)
├── Listings [icon: grid] (→ SCR-DASH-002)
│   └── + New Listing (quick action)
├── Messages [icon: chat + badge] (→ SCR-DASH-007)
├── Analytics [icon: chart] (→ SCR-DASH-004) [V1 gate]
├── Team [icon: users] (→ SCR-DASH-005)
├── Billing [icon: credit-card] (→ SCR-DASH-006)
└── Settings [icon: gear] (→ SCR-DASH-008)

Top Bar:
├── Global Search
├── Notification Bell (→ Notification Feed)
├── User Avatar → Profile dropdown
│   ├── Switch Organization (if multiple)
│   ├── My Profile
│   └── Logout
└── Org Name + Plan Badge
```

---

## 5.3 Super Admin Navigation

```
Admin Sidebar:
├── 🌐 Dashboard (→ SCR-ADMIN-001)
├── 👥 Tenants (→ SCR-ADMIN-002)
├── 🛡️ Moderation (→ SCR-ADMIN-003)
│   └── [Badge: queue count]
├── 🤖 AI Control (→ SCR-ADMIN-004)
├── 💳 Billing (→ SCR-ADMIN-005)
├── ⚙️ Settings (→ SCR-ADMIN-006)
└── 📋 Audit Log (→ SCR-ADMIN-007)

Top Bar:
├── [Platform: ADMIN MODE] badge
├── Impersonation indicator (when active)
└── Admin user avatar
```

---

## 5.4 Role-Aware Navigation Rules

| Role | Visible Navigation Items |
|:-----|:------------------------|
| **Visitor** | Public nav (search, marketplace, pricing, login, register) |
| **Buyer** | Public nav + saved searches (V1) + inquiry history |
| **Agent** | Sidebar: Overview, Listings (own), Messages, Analytics (own) |
| **Sales Rep** | Sidebar: Messages, Leads (V1), Analytics (limited) |
| **Admin** | Full sidebar except Billing manage |
| **Owner** | Full sidebar including Billing manage |
| **Content Moderator** | Admin nav: Moderation only |
| **Super Admin** | Full admin sidebar |

---

## 5.5 Mobile Navigation

```
Bottom Tab Bar (5 items):
├── 🏠 Home (feed)
├── 🔍 Search
├── ➕ Create (listing, if seller role)
├── 💬 Messages
└── 👤 Profile

Mobile Sidebar (hamburger):
└── Full navigation tree accessible via swipe-right gesture
```

---

# 6. BUYER JOURNEY MAP

---

## Stage 1: First Visit (Awareness)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Discover whether the platform has what I need |
| **Actions** | Land on homepage; read hero messaging; scroll trending listings |
| **Screens** | SCR-PUB-001 (Landing Page) |
| **Events Fired** | `analytics.page_viewed`, `analytics.scroll_depth` |
| **Analytics** | Bounce rate, time-on-page, source attribution (UTM), device type |
| **Pain Points** | Value proposition unclear; too few listings in niche; slow page load |
| **Optimization** | Clear hero message; trending category showcases; <2s LCP; SEO-rich meta |

---

## Stage 2: Discovery (Exploration)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Find a category or listing type relevant to my need |
| **Actions** | Click category; scroll non-personalized feed; type in search bar; see suggestions |
| **Screens** | SCR-PUB-002 (Category Browse), SCR-PUB-004 (Search Results) |
| **Events Fired** | `discovery.search_executed`, `discovery.feed_generated`, `discovery.item_impressed` |
| **Analytics** | Category CTR, search usage vs. browse usage, zero-results rate |
| **Pain Points** | Zero results for specific queries; irrelevant results; no typeahead |
| **Optimization** | Ensure all categories have ≥ 10 listings (seeding); typeahead suggestions; hybrid fallback |

---

## Stage 3: Search (Intent)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Find listings matching my specific requirement |
| **Actions** | Submit search query; apply filters; sort results; evaluate listings in grid |
| **Screens** | SCR-PUB-004 (Search Results) |
| **Events Fired** | `discovery.search_executed` (with query), `discovery.item_impressed` (per result) |
| **Analytics** | Query terms, result count, filter usage rates, position of clicked result |
| **Pain Points** | Too many irrelevant results; filters not fine-grained enough; no way to save search |
| **Optimization** | Vector search relevance tuning; filter expansion; saved search (V1) |

---

## Stage 4: Property / Listing View (Evaluation)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Evaluate whether a specific listing meets my requirement |
| **Actions** | Read full description; view gallery; check price; read reviews (V2); see similar listings |
| **Screens** | SCR-PUB-003 (Listing Detail) |
| **Events Fired** | `discovery.item_clicked`, `analytics.listing_viewed`, `analytics.gallery_interaction` |
| **Analytics** | Time-on-page, scroll depth, gallery click rate, contact rate from detail page |
| **Pain Points** | Incomplete listing descriptions; no reviews to verify quality; contact gated behind registration |
| **Optimization** | AI listing quality score visible; require minimum description length; reviews (V2); soft registration wall |

---

## Stage 5: Lead Generation (Conversion)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Contact the seller to discuss my requirement |
| **Actions** | Click "Contact" button; register if not authenticated; complete inquiry form; submit |
| **Screens** | SCR-AUTH-002 (Register, if new), SCR-PUB-003 (Inquiry form) |
| **Events Fired** | `marketplace.inquiry_submitted`, `identity.user_registered` |
| **Analytics** | Contact button CTR, registration completion rate, inquiry submission rate |
| **Pain Points** | Forced registration breaks flow; form too long; no confirmation feedback |
| **Optimization** | Single-field quick register before contact; short form (name, email, message only); immediate acknowledgment |

---

## Stage 6: Conversion & Communication

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Receive a response and progress toward a purchase decision |
| **Actions** | Check email for acknowledgment; receive seller response via messaging; negotiate; decide |
| **Screens** | SCR-DASH-007 (Messages — buyer-facing view) |
| **Events Fired** | `messaging.thread_created`, `messaging.message_sent` |
| **Analytics** | Response time (seller), conversation thread length, lead-to-close rate |
| **Pain Points** | Slow seller response; no structured follow-up; platform abandonment before deal closes |
| **Optimization** | Seller response time SLA (shown to buyers); follow-up nudge for seller; deal stage tracking (V1) |

---

## Stage 7: Retention (Post-Conversion)

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Return for future needs; find more relevant listings |
| **Actions** | Return visits; personalized feed exploration; review submission (V2) |
| **Screens** | SCR-PUB-001 (personalized homepage), SCR-PUB-002 (personalized browse) |
| **Events Fired** | `identity.session_started` (returning user), `analytics.clickstream` |
| **Analytics** | 30-day retention, DAU/MAU, return visit frequency, review submission rate |
| **Pain Points** | Non-personalized feed on return; no notification of new relevant listings |
| **Optimization** | Personalization fast loop (V1); email digest of new relevant listings; saved search alerts (V1) |

---

# 7. SELLER JOURNEY MAP

---

## Stage 1: Registration & Org Setup

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Create an account and establish marketplace presence |
| **Actions** | Register via email or Google; complete org setup wizard (name, industry, country); select plan |
| **Screens** | SCR-AUTH-002 (Register/Onboard) |
| **Events Fired** | `identity.user_registered`, `tenant.provisioned`, `monetization.subscription_initialized` |
| **Analytics** | Onboarding funnel completion rate, step-level drop-off, plan selected distribution |
| **Pain Points** | Too many fields; plan pricing unclear; no immediate value demonstration |
| **Optimization** | 3-step max wizard; show "you can list in 5 minutes" promise; free plan available |

---

## Stage 2: Profile Setup

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Establish credibility and brand on the marketplace |
| **Actions** | Complete org profile; upload logo; set description; configure notification preferences |
| **Screens** | SCR-DASH-008 (Settings) |
| **Events Fired** | `tenant.profile_updated` |
| **Analytics** | Profile completion rate, time-to-first-listing post-registration |
| **Pain Points** | Unclear what profile fields affect discovery; no completion progress indicator |
| **Optimization** | Profile completion percentage widget; tooltip: "Complete profile boosts trust score" |

---

## Stage 3: Listing Creation

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Create a compelling listing that attracts buyers |
| **Actions** | Navigate to create listing; fill all fields; upload media; set price; preview; submit |
| **Screens** | SCR-DASH-003 (Listing Create/Edit) |
| **Events Fired** | `marketplace.listing_created` → triggers embedding + moderation |
| **Analytics** | Time-to-complete, field completion rates, edit sessions before submit, media upload rate |
| **Pain Points** | Unclear what makes a "good" listing; image upload UX friction; no preview of discovery appearance |
| **Optimization** | AI quality score preview (V1); real-time field completion feedback; discovery preview mode |

---

## Stage 4: Publishing & Moderation

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Get listing live as fast as possible |
| **Actions** | Submit listing → await moderation → receive notification of approval/rejection |
| **Screens** | SCR-DASH-002 (Listing list with status), SCR-DASH-001 (notification) |
| **Events Fired** | `trust.content_approved` / `trust.content_quarantined`, real-time push |
| **Analytics** | Time-to-active (submission → live), rejection rate, rejection reason distribution |
| **Pain Points** | No visibility into moderation status; vague rejection reasons; no appeal path |
| **Optimization** | Real-time moderation status updates; specific rejection reason with improvement guidance; V1 appeals |

---

## Stage 5: Lead Handling

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Respond to buyer inquiries quickly and qualify leads |
| **Actions** | Receive inquiry notification; view buyer context; respond; update lead status; assign to sales rep |
| **Screens** | SCR-DASH-007 (Messages), notification in SCR-DASH-001 |
| **Events Fired** | `messaging.message_sent`, `marketplace.lead_status_updated` |
| **Analytics** | Response time, inquiry volume per listing, lead conversion rate |
| **Pain Points** | No lead qualification data; all inquiries look the same; slow to respond = lost deal |
| **Optimization** | AI-powered lead priority scoring (V2); buyer profile context; response template suggestions |

---

## Stage 6: Analytics Review

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Understand which listings perform and optimize accordingly |
| **Actions** | View listing performance dashboard; identify top/bottom performers; optimize weak listings |
| **Screens** | SCR-DASH-004 (Analytics Dashboard, V1) |
| **Events Fired** | Analytics page views, export events |
| **Analytics** | KPI dashboard engagement, export rate, optimization action rate |
| **Pain Points** | No actionable recommendations; data without context; no benchmark comparison |
| **Optimization** | AI-generated optimization suggestions; listing quality rank; anonymized category benchmarks (V2) |

---

## Stage 7: Renewal & Growth

| Attribute | Detail |
|:----------|:-------|
| **User Goal** | Continue subscription; expand listing portfolio; upgrade plan |
| **Actions** | Renew subscription; upgrade plan for more features/quota; create more listings; run ad campaigns (V1) |
| **Screens** | SCR-DASH-006 (Billing), SCR-DASH-002 (Listings) |
| **Events Fired** | `monetization.subscription_changed`, `monetization.payment_received` |
| **Analytics** | Renewal rate, upgrade rate, listing growth rate per tenant |
| **Pain Points** | Unclear ROI of higher plan; no upgrade nudge at right moment |
| **Optimization** | Contextual upgrade prompts (triggered when approaching limits); clear value proposition per tier |

---

# 8. AGENT JOURNEY MAP

---

## 8.1 Lead Management Workflow

```
1. New inquiry notification → real-time push via WebSocket
   └── Notification bell highlights
   └── Email notification (async, within 60s)

2. Open inquiry in Messages (SCR-DASH-007)
   └── View buyer profile context
   └── View listing context

3. Respond to inquiry
   └── Text reply
   └── Attach document (V1)
   └── Set follow-up reminder (V1)

4. Update lead status
   └── New → Contacted
   └── Contacted → Qualified / Unqualified
   └── Qualified → Converted / Closed-Lost

5. Assign to Sales Rep (if role separation exists)
```

**Agent Goals**: <2h response time target; ≥ 30% lead qualification rate

---

## 8.2 Listing Management Workflow

```
1. Create listing (SCR-DASH-003)
   └── Fill all fields + upload media
   └── AI quality score feedback (V1)
   └── Submit → Pending Review

2. Monitor moderation status (SCR-DASH-002)
   └── Real-time status updates
   └── Rejection → view reason → edit → resubmit

3. Manage active listings
   └── Update description / price
   └── Add gallery images
   └── Archive seasonal listings
   └── Renew expiring listings (V2)
```

---

## 8.3 Analytics & Performance Tracking

```
Personal analytics (SCR-DASH-004):
├── My listings performance (views, CTR, leads)
├── My response time average
├── My conversion rate
└── Ranking position for key search terms (V1)
```

---

## 8.4 Team Collaboration

```
- Assign inquiries to colleagues (V1)
- View team performance in aggregate (Admin/Owner only)
- @mention team members in message threads (V2)
- Shared listing drafts (V2)
```

---

# 9. COMPANY JOURNEY MAP

---

## 9.1 Organization Setup

```
Step 1: Registration (SCR-AUTH-002)
└── Account creation → Org wizard → Plan selection

Step 2: Profile configuration (SCR-DASH-008)
└── Logo, description, contact info, website

Step 3: Team setup (SCR-DASH-005)
└── Invite agents, admins, sales reps
└── Assign roles

Step 4: First listing creation (SCR-DASH-003)
└── Training: walkthrough guide (V1)

Step 5: Custom domain (V1) (SCR-DASH-008)
└── CNAME configuration → domain verification → SSL
```

---

## 9.2 Team Management Workflow

```
Onboard new agent:
└── Invite via email → role: Agent → accept → complete profile

Manage roles:
└── Promote member: Member → Admin
└── Demote: Admin → Member
└── Remove: Revoke access immediately

Handle departure:
└── Reassign open leads
└── Reassign active listings
└── Remove member
```

---

## 9.3 Billing & Subscription Management

```
Monthly workflow:
└── Review usage meter (before billing date)
└── Check invoice for line items
└── Download invoice PDF for accounting

Upgrade decision trigger:
└── Approaching listing limit → upgrade prompt
└── Approaching token quota → top-up or upgrade
└── New team members needed → upgrade seat plan

Downgrade scenario:
└── Confirm quota reduction
└── Archive excess listings automatically
```

---

## 9.4 Analytics Governance

```
Weekly team review:
└── Open Analytics Dashboard
└── Review top-performing listings
└── Identify underperforming listings → action plan
└── Review lead volume and response time

Monthly executive review:
└── Export performance CSV
└── Review conversion funnel
└── Compare vs. previous month
└── Plan next month's listing strategy
```

---

## 9.5 Branch Management (V1)

```
Create branch:
└── Admin creates sub-workspace (branch)
└── Assign Branch Manager

Configure branch:
└── Branch-specific listings
└── Branch-specific team

Governance:
└── HQ visibility into all branches
└── Branch analytics aggregated to org level
└── Branch-level billing contribution tracking (V2)
```

---

# 10. SUPER ADMIN JOURNEY MAP

---

## 10.1 Daily Platform Health Check

```
1. Open Global Dashboard (SCR-ADMIN-001)
   └── P95 latency: all green (<50ms discovery, <200ms API)
   └── Error rate: <0.1%
   └── Active tenants: trending up/stable
   └── Moderation queue: check depth

2. Review alert feed
   └── Any SLO breaches → open runbook
   └── Any fraud alerts → review in moderation queue

3. Moderation queue (SCR-ADMIN-003)
   └── Process all HIGH priority items (risk score > 0.7)
   └── Assign MEDIUM items to platform operators
   └── Track SLA compliance
```

---

## 10.2 Tenant Management Workflow

```
New tenant onboarded:
└── Verify provisioning succeeded (tenant list shows ACTIVE)
└── Check initial trust score = 1.0 (new)

Tenant suspension:
└── Receive fraud alert → review trust flags
└── Review tenant listing history
└── Manual review → decision: suspend or clear
└── Suspend: immediate access revocation + email notification

Tenant impersonation (for support):
└── Navigate to tenant → "Impersonate" (read-only mode)
└── View as the tenant → diagnose issue
└── Exit impersonation → action audit logged
```

---

## 10.3 AI Governance Workflow

```
Weekly AI review:
└── Open AI Control Center (SCR-ADMIN-004)
└── Review global token usage (vs. budget)
└── Review cache hit rate (target: ≥ 60%)
└── Check provider health (OpenAI, Anthropic status)
└── Review any failed moderation scans

Experiment management:
└── Set up A/B test (e.g., Stage 3 re-ranker ON vs. OFF)
└── Monitor CTR lift
└── Declare winner → graduate to 100% rollout → disable flag
```

---

## 10.4 Billing Governance Workflow

```
End-of-month:
└── Open Billing Ledger (SCR-ADMIN-005)
└── Verify Stripe sync (all invoices match ledger)
└── Identify any billing anomalies (duplicate charges, missing payments)
└── Export revenue CSV for finance team

Dispute handling:
└── Tenant flags billing issue → Support ticket
└── Review ledger entries for tenant
└── Issue refund if warranted (via Stripe API)
└── Document in audit log
```

---

## 10.5 Trust & Safety Operations

```
Fraud detection alert → investigate:
└── Review trust.fraud_detected event in admin dashboard
└── Inspect flagged listings / behavior pattern
└── Decision: immediate suspend OR watch-list
└── If watch-list: set behavioral alert threshold (V1)

Policy update:
└── Update policy rule in registry
└── Test against sample content batch
└── Activate new rule
└── Monitor false positive rate for 24h
```

---

## 10.6 Platform Operations

```
Feature flag rollout:
└── Target 10% → monitor metrics → 50% → 100%
└── Kill-switch if error rate spikes

Maintenance window:
└── Broadcast announcement via platform:global WebSocket
└── Toggle maintenance mode
└── Deploy changes
└── Toggle maintenance off
└── Verify all health checks green

Schema migration:
└── Review migration in audit (SCR-ADMIN-007)
└── Confirm staging environment tested
└── Execute migration (off-peak hours)
└── Verify zero data loss
```

---

# 11. FEATURE ACCESS MATRIX

> **Legend**: ✅ Allowed | 🚫 Restricted | ⚡ Conditional | 🔄 Inherited | 👑 Delegated

---

## 11.1 Marketplace Features

| Feature | Visitor | Buyer | Agent | Sales Rep | Admin | Owner | Super Admin |
|:--------|:--------|:------|:------|:----------|:------|:------|:------------|
| View listings (public) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit inquiry | 🚫 | ✅ | 🔄 | ✅ | ✅ | ✅ | ⚡ |
| Create listing | 🚫 | 🚫 | ✅ | 🚫 | ✅ | ✅ | ⚡ |
| Edit own listing | 🚫 | 🚫 | ✅ | 🚫 | ✅ | ✅ | ✅ |
| Edit any listing (in tenant) | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ |
| Delete listing | 🚫 | 🚫 | ✅ (own) | 🚫 | ✅ | ✅ | ✅ |
| Bulk import listings | 🚫 | 🚫 | ⚡ (V1) | 🚫 | ✅ | ✅ | ✅ |
| Write review | 🚫 | ✅ (V2) | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

## 11.2 Team Management Features

| Feature | Agent | Sales Rep | Branch Mgr | Admin | Owner | Super Admin |
|:--------|:------|:----------|:-----------|:------|:------|:------------|
| Invite member | 🚫 | 🚫 | ⚡ (branch) | ✅ | ✅ | ✅ |
| Remove member | 🚫 | 🚫 | ⚡ (branch) | ✅ | ✅ | ✅ |
| Change role | 🚫 | 🚫 | ⚡ (branch) | ⚡ (non-Owner) | ✅ | ✅ |
| View team | 🔄 | ✅ | ✅ (branch) | ✅ | ✅ | ✅ |
| Transfer ownership | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ |

---

## 11.3 Analytics Features

| Feature | Agent | Sales Rep | Admin | Owner | AI Operator | Analytics Mgr | Super Admin |
|:--------|:------|:----------|:------|:------|:------------|:--------------|:------------|
| Own listing analytics | ✅ | 🚫 | ✅ | ✅ | 🚫 | ✅ (all) | ✅ |
| Org-level analytics | 🚫 | 🚫 | ✅ | ✅ | 🚫 | ✅ | ✅ |
| AI token usage | 🚫 | 🚫 | ✅ (read) | ✅ | ✅ | ✅ | ✅ |
| Platform-wide analytics | 🚫 | 🚫 | 🚫 | 🚫 | ⚡ (AI) | ✅ | ✅ |
| Export data | 🚫 | 🚫 | ✅ | ✅ | 🚫 | ✅ | ✅ |

---

## 11.4 Billing Features

| Feature | Agent | Admin | Owner | Billing Mgr | Super Admin |
|:--------|:------|:------|:------|:------------|:------------|
| View current plan | ✅ | ✅ | ✅ | ✅ | ✅ |
| View invoices | 🚫 | ✅ (read) | ✅ | ✅ | ✅ |
| Upgrade/downgrade plan | 🚫 | 🚫 | ✅ | 🚫 | ✅ |
| Manage payment method | 🚫 | 🚫 | ✅ | 🚫 | 🚫 |
| View usage meters | 🚫 | ✅ (read) | ✅ | ✅ | ✅ |
| Issue refund | 🚫 | 🚫 | 🚫 | ✅ | ✅ |
| Override plan (admin) | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |

---

## 11.5 Trust & Safety Features

| Feature | Seller/Agent | Admin | Owner | Moderator | Super Admin |
|:--------|:-------------|:------|:------|:----------|:------------|
| View own trust score | ✅ | 🔄 | ✅ | ✅ | ✅ |
| View any trust score | 🚫 | ✅ (tenant) | ✅ (tenant) | ✅ | ✅ |
| Submit appeal | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Review moderation queue | 🚫 | ⚡ (own) | ⚡ (own) | ✅ | ✅ |
| Approve/reject content | 🚫 | 🚫 | 🚫 | ✅ | ✅ |
| Suspend account | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| Configure policy rules | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |

---

## 11.6 Admin-Only Features

| Feature | Platform Operator | AI Operator | Analytics Mgr | Billing Mgr | Super Admin |
|:--------|:-----------------|:------------|:--------------|:------------|:------------|
| Tenant impersonation | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| Feature flag control | 🚫 | ⚡ (AI flags) | 🚫 | 🚫 | ✅ |
| Model registry management | 🚫 | ✅ | 🚫 | 🚫 | ✅ |
| Global AI budget control | 🚫 | ✅ | 🚫 | 🚫 | ✅ |
| Audit log access | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| Schema migrations | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| Maintenance mode | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |

---

# 12. MVP FEATURE DEFINITION

---

## 12.1 MVP Features (Private Beta — Sprint 0-7)

**Hypothesis**: Multi-tenant AI search is demonstrably better than keyword search, with zero data leakage and ≥ 90% automated moderation.

| Feature | Domain | Why Included | Business Impact |
|:--------|:-------|:-------------|:----------------|
| Email/Password + Google OAuth | Identity | Minimum viable auth; lower friction | User acquisition |
| JWT with tenant claims | Identity | Foundation of all data isolation | Security - non-negotiable |
| Organization creation + provisioning | Tenant | Core B2B SaaS primitive | Tenant growth |
| RBAC: Owner/Admin/Member/Viewer | Tenant | Enterprise compliance requirement | Enterprise sales readiness |
| Listing CRUD (all fields) | Marketplace | Supply side without supply = no marketplace | Supply growth |
| 2-level category taxonomy | Marketplace | Discovery without structure fails | Discovery quality |
| Listing status workflow | Marketplace | Quality control baseline | Platform trust |
| Listing image management | Marketplace | Visual discovery; buyer confidence | CTR improvement |
| Vector semantic search (Stage 1+2) | Discovery | Core platform hypothesis validation | Relevance lift |
| BM25 keyword fallback | Discovery | Reliability when vector index unavailable | Reliability |
| Faceted filtering (category, price, tags) | Discovery | Basic search refinement | Search quality |
| Typeahead suggestions | Discovery | Search engagement | UX quality |
| Non-personalized trending feed | Discovery | Homepage value before personalization | New user engagement |
| Listing embedding generation | AI | Foundational for all semantic search | Search quality |
| LLM content moderation | AI + Trust | 90%+ automated trust decisions | Platform safety |
| Basic trust score per tenant | Trust | Discovery ranking signal | Marketplace quality |
| Auto-quarantine / auto-approve | Trust | Automated content pipeline | Operational efficiency |
| Admin moderation queue | Trust | Human review for borderline cases | Platform safety |
| WebSocket push (listing status) | Realtime | UX responsiveness | Seller experience |
| Quota warning push (WebSocket) | Realtime | Usage transparency | Seller experience |
| Fixed plan limits (hard quotas) | Monetization | Billing control foundation | Revenue protection |
| Manual billing (invoice-based) | Monetization | Private beta doesn't need Stripe complexity | Ops simplicity |
| AI token usage meter (basic) | Analytics | Usage transparency | Self-service |
| Public marketplace storefront | Frontend | SEO-indexed supply discovery | Buyer acquisition |
| Tenant dashboard (listing management) | Frontend | Core seller workflow | Seller value |
| Super Admin console (minimal — moderation queue only) | Frontend | Operational necessity | Trust safety |

---

## 12.2 Required Features (V1 — Public Beta)

| Feature | Domain | Why Now | Business Impact |
|:--------|:-------|:--------|:----------------|
| Stripe subscription billing | Monetization | Revenue generation | $10K MRR target |
| Usage-based overage billing | Monetization | Aligns cost with usage | Margin improvement |
| Ad auction engine (CPC) | Monetization | Additional revenue stream | +30% revenue |
| Stage 3 neural re-ranking | Discovery | Relevance lift after MVP data | NDCG ≥ 0.75 |
| Stage 4 exploration injection | Discovery | Feedback loop prevention | Feed freshness |
| Real-time preference vector updates | Discovery | Personalization flywheel start | CTR +30% |
| Semantic prompt cache | AI | 60%+ LLM cost reduction | Margin |
| Multi-provider fallback | AI | Reliability | Uptime SLAs |
| Behavioral anomaly detection | Trust | Fraud scale up | Platform safety |
| Trust score decay model | Trust | Dynamic trust tracking | Quality |
| Bulk listing import (CSV) | Marketplace | Power user onboarding | Tenant activation |
| Custom domain mapping | Tenant | White-label foundation | Enterprise readiness |
| Full analytics dashboard | Analytics | Retention; platform value demonstration | Churn reduction |
| Billing portal (Stripe-hosted) | Frontend | Self-service billing | Support reduction |
| Appeals system | Trust | Seller fairness | Satisfaction |

---

## 12.3 Optional Features (V2 — General Availability)

| Feature | Domain | Why Deferred | Business Impact |
|:--------|:-------|:-------------|:----------------|
| Collaborative filtering | Discovery | Needs ≥ 6 months behavioral data | Personalization quality |
| Reviews & ratings | Marketplace | Requires transaction verification system first | Trust + conversion |
| Dynamic custom attributes | Marketplace | Complex schema management | Vertical depth |
| SAML/SSO enterprise login | Identity | Enterprise sales deals needed first | Enterprise unlocking |
| Cohort & retention analytics | Analytics | Needs 3+ months of user data | Business intelligence |
| LTV modeling | Analytics | Needs cohort data first | Investor reporting |
| Local model execution | AI | Infrastructure cost justification needed | Cost optimization |
| Seller verification tiers | Trust | Needs V1 trust system maturity | Quality signal |
| Location-based discovery | Discovery | Infrastructure complexity vs. use case | Vertical expansion |
| White-label theming | Frontend | Enterprise feature | Enterprise sales |

---

## 12.4 Future Features (V3 — Enterprise Platform)

| Feature | Domain | Why Future | Business Impact |
|:--------|:-------|:-----------|:----------------|
| Public developer API | Platform | Ecosystem play; requires platform maturity | Partner revenue |
| Discovery-as-a-Service | Discovery | B2B2C model; requires stable V2 pipeline | New revenue stream |
| Multi-region deployment | Infrastructure | Cost + compliance; requires revenue to justify | Compliance + Enterprise |
| SCIM provisioning | Identity | Large enterprise requirement | Enterprise deals |
| YubiKey / hardware MFA | Identity | High-security enterprise requirement | Security compliance |
| Custom LLM fine-tuning | AI | Enterprise differentiation | Premium ARR |
| Partner/reseller program | Platform | Ecosystem scaling | Channel revenue |
| Data-driven attribution | Analytics | Requires large dataset | Marketing optimization |

---

## 12.5 Experimental Features

| Feature | Hypothesis | Test Method |
|:--------|:-----------|:------------|
| AI-generated listing descriptions | LLM-assisted writing improves listing quality by ≥ 20% | A/B test on listing quality score and CTR |
| Conversational search (chatbot) | Dialogue-based search increases engagement for complex queries | Controlled experiment with power users |
| AI-powered lead scoring | ML prioritization increases sales rep conversion by ≥ 15% | A/B test on response time and close rate |
| Dynamic pricing suggestions | AI price recommendations align supply with market demand | A/B test on lead-to-conversion rate |

---

# 13. AI FEATURE INVENTORY

---

## 13.1 Semantic Search

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Transform natural language queries into vector representations for relevance-based retrieval |
| **Inputs** | User query text, tenant context, current filters |
| **Outputs** | Ordered list of listing candidates (top-500, then top-25 after ranking) |
| **Dependencies** | text-embedding-3-small model, pgvector HNSW index, Redis cache |
| **Business Value** | Core platform differentiator; 2× relevance improvement over keyword search |
| **MVP** | ✅ |

---

## 13.2 Personalized Recommendations

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Surface listings aligned with individual user's behavioral preference history |
| **Inputs** | User preference vector (Redis), listing embedding vectors, tenant context |
| **Outputs** | Personalized ordered listing feed (top-25) |
| **Dependencies** | Fast loop preference update system, pgvector, Stage 1-3 pipeline |
| **Business Value** | Higher CTR (+30% target), session depth, retention |
| **MVP** | ❌ (V1) |

---

## 13.3 Neural Re-Ranking

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Apply ML cross-encoder to reorder candidate set by predicted user preference |
| **Inputs** | Stage 2 candidate pool (top-100), user preference vector, listing feature vectors |
| **Outputs** | Re-ranked top-25 with relevance scores |
| **Model** | XGBoost cross-encoder (trained on MVP behavioral data) |
| **Dependencies** | Stage 1+2 pipeline, behavioral training data, ONNX model serving |
| **Business Value** | NDCG@10 ≥ 0.75 vs. Stage 2 baseline |
| **MVP** | ❌ (V1) |

---

## 13.4 Preference Vector Personalization (Fast Loop)

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Update user's interest representation in real-time based on session interactions |
| **Inputs** | Click events, view duration events, hover events; current preference vector |
| **Outputs** | Updated preference vector (1536-d); stored in Redis |
| **Algorithm** | Exponential Moving Average: V_user(t) = α × V_user(t-1) + (1-α) × V_item, α=0.85 |
| **Dependencies** | Clickstream API, Redis, AI embedding vectors |
| **Business Value** | Session-aware personalization; feed improves during user session |
| **MVP** | ❌ (V1) |

---

## 13.5 Content Enrichment & Quality Scoring

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Analyze and improve listing content quality for discovery optimization |
| **Inputs** | Listing title, description, tags, category, price |
| **Outputs** | Quality score (0-100), specific improvement suggestions, missing field alerts |
| **Dependencies** | LLM inference (GPT-4o-mini), listing content |
| **Business Value** | Better listings → higher CTR → more leads → seller retention |
| **MVP** | ❌ (V1) |

---

## 13.6 Listing Intelligence (Auto-Tagging, SEO)

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | AI-assisted tag suggestion and SEO title optimization |
| **Inputs** | Listing description, category, existing tags |
| **Outputs** | Suggested tags (up to 10), optimized title variant suggestions |
| **Dependencies** | LLM inference, embedding-based tag corpus matching |
| **Business Value** | Improves listing discoverability; reduces seller effort |
| **MVP** | ❌ (V1) |

---

## 13.7 Lead Intelligence (V2)

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Score and prioritize inbound buyer inquiries by purchase intent signals |
| **Inputs** | Buyer browsing history, inquiry text, listing viewed, session signals |
| **Outputs** | Lead quality score (0-100), intent category, recommended response time |
| **Dependencies** | Behavioral data pipeline, LLM text classification |
| **Business Value** | Sales rep efficiency; higher conversion rate on best leads |
| **MVP** | ❌ (V2) |

---

## 13.8 Fraud Detection (AI-Assisted)

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Detect fraudulent listing content and behavioral manipulation |
| **Inputs** | Listing text, behavioral velocity signals, trust history |
| **Outputs** | Risk score (0.0-1.0), flagging reason list, quarantine decision |
| **Model** | LLM classification (GPT-4o-mini) + vector similarity toxicity detection |
| **Dependencies** | Trust & Safety domain, LLM inference, Redis behavioral windows |
| **Business Value** | 90%+ automated trust decisions; platform safety |
| **MVP** | ✅ |

---

## 13.9 Content Moderation

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Screen all listing submissions against platform policy |
| **Inputs** | Listing title, description, tags, uploaded images (V2) |
| **Outputs** | Moderation score (0.0-1.0), policy violation categories, action decision |
| **Scoring** | <0.3 → auto-approve; 0.3-0.7 → human review; >0.7 → auto-quarantine |
| **Dependencies** | GPT-4o-mini, trust scoring model, moderation queue |
| **Business Value** | Recall ≥ 95%, false positive ≤ 5% (MVP launch gates) |
| **MVP** | ✅ |

---

## 13.10 AI Analytics

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Monitor and optimize AI system performance and cost |
| **Inputs** | Inference logs, cache hits/misses, token usage, latency traces |
| **Outputs** | Cost dashboards, efficiency metrics, quality indicators (NDCG@10) |
| **Dependencies** | ClickHouse analytics pipeline, Kafka AI event stream |
| **Business Value** | Cost governance; quality assurance; provider optimization |
| **MVP** | ✅ (basic meter); V1 (full analytics) |

---

## 13.11 Semantic Cache

| Attribute | Detail |
|:----------|:-------|
| **Purpose** | Avoid redundant LLM API calls for semantically similar queries |
| **Inputs** | Prompt text, current user/tenant context |
| **Outputs** | Cached response (if hit); full inference (if miss) |
| **Algorithm** | Prompt → embedding → cosine similarity vs. cache ≥ 0.96 → cache hit |
| **Dependencies** | Redis (vector-capable), embedding model, LLM inference |
| **Business Value** | 60%+ cache hit rate target; 40-60% LLM cost reduction |
| **MVP** | ❌ (V1) |

---

# 14. ANALYTICS FEATURE INVENTORY

---

## 14.1 Marketplace Analytics

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **Listing Performance Dashboard** | Per-listing views, CTR, lead rate | views, clicks, CTR, leads, conversion | Analytics | V1 |
| **Category Heatmap** | Engagement by category | category impressions, CTR, inquiry rate | Analytics | V1 |
| **Search Term Analytics** | Most searched terms, zero-result queries | query volume, CTR per query, zero-result % | Analytics | V1 |
| **Inquiry Volume Tracking** | Lead inflow trends | inquiries/day, response rate, resolution rate | Analytics | MVP |
| **Listing Quality Distribution** | Distribution of quality scores | quality score histogram, correlation with CTR | Analytics | V1 |

---

## 14.2 Discovery Analytics

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **Feed Impressions** | Count of listings shown per session | impressions, unique impressions, CTR | Analytics | MVP |
| **Ranking Explainability** | Per-listing ranking factor breakdown | vector_similarity, trust_score, bid_boost | Discovery | V1 |
| **Re-Ranker Quality** | ML model quality monitoring | NDCG@10, precision@5, model drift | AI + Analytics | V1 |
| **Exploration Rate** | Rate of exploration vs. exploitation items | exploration_fraction, exploration CTR | Discovery | V1 |
| **Search-to-Discovery Split** | How users find listings | % via search, % via feed, % via category | Analytics | V1 |
| **Collaborative Filter Lift** | Personalization impact on engagement | session depth increase, CTR lift, retention | Analytics | V2 |

---

## 14.3 AI Analytics

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **Token Usage Dashboard** | Real-time and historical token consumption | tokens_in, tokens_out, cost_USD | Monetization | MVP |
| **Cache Performance** | Semantic cache effectiveness | cache_hit_rate, cost_saved, latency_delta | AI Infra | V1 |
| **Provider Latency** | LLM provider performance breakdown | p50/p95/p99 latency per provider | AI Infra | V1 |
| **Moderation Accuracy** | LLM moderation system quality | recall, precision, false_positive_rate | Trust + AI | MVP |
| **Model Cost Breakdown** | Cost by model, operation type, tenant tier | cost_per_model, cost_per_op_type | AI Infra | V1 |
| **Inference Queue Depth** | Background job queue health | queue_depth, p95_wait_time, failures | AI Infra | V1 |

---

## 14.4 Revenue Analytics

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **MRR Dashboard** | Monthly recurring revenue tracking | MRR, MRR growth %, churn MRR | Monetization | V1 |
| **ARR Projection** | Annualized revenue forecast | ARR, ARR projection 12-month | Monetization | V1 |
| **Revenue by Plan** | Revenue breakdown per tier | revenue_starter, revenue_growth, revenue_enterprise | Monetization | V1 |
| **Churn Analysis** | Churned tenants and reasons | churn_rate, churn_by_plan, avg_tenure_before_churn | Analytics | V1 |
| **Ad Revenue Breakdown** | Advertising revenue tracking | ad_revenue_daily, win_rate, avg_CPC | Monetization | V1 |
| **LTV by Cohort** | Customer lifetime value by signup cohort | LTV_3m, LTV_6m, LTV_12m | Analytics | V2 |

---

## 14.5 Tenant Analytics (Self-Service)

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **Overview KPI Panel** | Core KPIs for tenant dashboard | impressions, CTR, leads, active_listings | Analytics | V1 |
| **Conversion Funnel** | Discovery → view → inquiry → close | funnel_step_rates, drop-off points | Analytics | V1 |
| **AI Token Usage** | Tenant-scoped token consumption | tokens_used, tokens_remaining, cost_USD | Monetization | MVP |
| **Top Performing Listings** | Ranked listing leaderboard | top_listings by CTR, by views, by leads | Analytics | V1 |
| **Competitor Benchmarks** (anonymized) | Tenant vs. category average | category_avg_CTR, category_avg_response_time | Analytics | V2 |
| **Cohort Retention** | 30/60/90 day retention for buyer cohorts | D30, D60, D90 retention rates | Analytics | V2 |

---

## 14.6 Operational Analytics (Admin)

| Feature | Description | Metrics | Owner | MVP |
|:--------|:-----------|:--------|:------|:----|
| **Platform Health KPIs** | System reliability metrics | uptime %, error_rate, P95_latency | Observability | MVP |
| **Tenant Activation Funnel** | Onboarding conversion | registration→first_listing, first_listing→active | Analytics | V1 |
| **Moderation SLA Tracking** | Review queue SLA compliance | avg_review_time, SLA_breach_rate | Trust | MVP |
| **Trust Score Distribution** | Platform-wide trust health | trust_score_histogram, flagged_tenant_rate | Trust | V1 |
| **Infrastructure Cost Breakdown** | Cost per service per month | infra_cost_by_service, cost_per_tenant | Observability | V1 |
| **Event Mesh Health** | Kafka topic lag and consumer health | consumer_lag, failed_events, retry_rate | Observability | V1 |

---

# 15. BILLING FEATURE INVENTORY

---

## 15.1 Subscription Plans

| Plan | Listing Quota | AI Token Quota | Team Seats | Features | Price |
|:-----|:-------------|:---------------|:-----------|:---------|:------|
| **Starter** | 25 listings | 100K tokens/month | 3 seats | Basic search, email support | Free / Manual billing |
| **Growth** | 250 listings | 1M tokens/month | 15 seats | Full discovery, AI enrichment, analytics | $149/month |
| **Enterprise** | Unlimited | Custom quota | Unlimited | Custom domain, SSO, SLA, dedicated support | Custom |

---

## 15.2 Subscription Management

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Plan selection at registration | Choose plan in onboarding wizard | ✅ | ✅ |
| Manual billing (private beta) | Invoice-based billing for early tenants | ✅ | — |
| Stripe Checkout integration | Credit card subscription flow | ❌ | ✅ |
| Self-serve plan upgrade | Immediate plan upgrade via billing portal | ❌ | ✅ |
| Self-serve plan downgrade | Downgrade with proration + quota enforcement | ❌ | ✅ |
| Stripe Customer Portal | Stripe-hosted billing self-service | ❌ | ✅ |
| Invoice PDF generation | Automated invoice for each billing cycle | ❌ | ✅ |
| Dunning management | Payment failure retry + notifications | ❌ | ✅ |
| Trial period | 14-day free trial on Growth plan (V2) | ❌ | ❌ |

---

## 15.3 Usage Tracking

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| AI token metering | Per-request token counting and ledger writes | ✅ | ✅ |
| Real-time usage meter in dashboard | Live display of token usage % | ✅ | ✅ |
| Storage usage tracking | GB used per tenant | ❌ | V1 |
| API request counting | Per-tenant API call tracking | ❌ | V1 |
| Overage detection and alerting | Auto-alert at 80% and 100% usage | ✅ (quota block) | ✅ (alert) |
| Overage billing | Auto-charge for tokens above plan limit | ❌ | ✅ |

---

## 15.4 AI Credit System

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Credit top-up (prepaid) | Buy additional token credits | ❌ | ✅ |
| Credit balance display | Current credit balance in dashboard | ❌ | ✅ |
| Credit expiry | Credits expire after 12 months | ❌ | ✅ |
| Credit auto-reload | Auto-purchase credits at threshold | ❌ | V2 |

---

## 15.5 Ad Campaign Billing

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Campaign creation with budget cap | CPC/CPM bids with daily/monthly limits | ❌ | ✅ |
| Real-time spend tracking | Live campaign spend vs. budget | ❌ | ✅ |
| Auction win reporting | Win rate, average CPC paid | ❌ | ✅ |
| Campaign invoice line items | Ad spend in monthly invoice | ❌ | ✅ |

---

## 15.6 Invoices & Payments

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Invoice generation | Monthly automated invoice | Manual | ✅ |
| Invoice line items | Subscription + usage + ad spend | ❌ | ✅ |
| Invoice PDF download | Tenant-downloadable invoice PDF | ❌ | ✅ |
| Payment failure handling | Retry logic + email notifications | ❌ | ✅ |
| Stripe webhook processing | Real-time payment event handling | ❌ | ✅ |
| Revenue reporting (admin) | MRR/ARR dashboard for Finance | ❌ | ✅ |

---

# 16. TRUST & SAFETY FEATURE INVENTORY

---

## 16.1 Content Moderation

| Feature | Description | Automation | MVP | V1 |
|:--------|:-----------|:-----------|:----|:---|
| Pre-publish LLM toxicity scan | GPT-4o-mini evaluates all content pre-live | 100% | ✅ | ✅ |
| Spam pattern detection | Vector-similarity matching against spam corpus | 100% | ✅ | ✅ |
| Auto-approve (score <0.3) | Automatic approval for safe content | 100% | ✅ | ✅ |
| Auto-quarantine (score >0.7) | Automatic hold for high-risk content | 100% | ✅ | ✅ |
| Human review queue (0.3-0.7) | Platform moderator reviews borderline | Human | ✅ | ✅ |
| Image moderation (V2) | Vision AI scan for prohibited imagery | 100% | ❌ | ❌ |
| Bulk content scan | Scan imported listings in batch | 100% | ❌ | ✅ |

---

## 16.2 Fraud Detection

| Feature | Description | Detection Type | MVP | V1 |
|:--------|:-----------|:--------------|:----|:---|
| High-velocity listing detection | Detect unnatural listing burst rates | Rule-based (Redis) | ❌ | ✅ |
| Unusual price manipulation | Detect extreme price changes to game ranking | Rule-based | ❌ | ✅ |
| Review manipulation detection | Detect fake review patterns | ML pattern | ❌ | ❌ (V2) |
| IP reputation checking | Cross-reference IP against known fraud lists | API-based | ❌ | ✅ |
| Device fingerprinting | Multi-account detection | Fingerprint hash | ❌ | ✅ |
| Multi-account detection | Same entity operating multiple tenants | Graph analysis | ❌ | V2 |

---

## 16.3 Trust Scores

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Initial trust score (1.0 for new tenants) | Full trust for new accounts | ✅ | ✅ |
| Trust score factors | Moderation history, account age, activity | Basic | V1 |
| Trust score impact on ranking | Score × vector_distance in Stage 2 | ✅ | ✅ |
| Trust score decay model | Score decays with inactivity or violations | ❌ | ✅ |
| Trust score visibility to seller | Seller sees own score + improvement tips | ❌ | ✅ |
| Seller verification tiers | Bronze/Silver/Gold verified badges | ❌ | ❌ (V2) |

---

## 16.4 Reporting & Appeals

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Listing report (by buyer) | Buyers can flag listings for review | ❌ | ✅ |
| Report review workflow | Moderator reviews reported listings | ❌ | ✅ |
| Seller appeal submission | Contest quarantine/rejection decisions | ❌ | ✅ |
| Appeal review SLA | 48-hour response target | ❌ | ✅ |
| Appeal outcome notification | Email + in-app notification of decision | ❌ | ✅ |

---

## 16.5 Policy Enforcement

| Feature | Description | MVP | V1 |
|:--------|:-----------|:----|:---|
| Listing quarantine | Immediate listing suspension | ✅ | ✅ |
| Account suspension (manual) | Super Admin manually suspends tenant | ✅ | ✅ |
| Automated lockout (behavioral) | System auto-suspends high-risk accounts | ❌ | ✅ |
| Warning issuance | Formal policy warning before suspension | ❌ | ✅ |
| Permanent ban | Full account termination with data lock | ❌ | ✅ |
| Policy rule versioning | Configurable policy rules with version history | ❌ | ✅ |

---

# 17. PRIORITIZATION MATRIX

---

## 17.1 Feature Priority Classification

| Priority | Label | Criteria |
|:---------|:------|:---------|
| **P0 — MVP** | Must-have for private beta launch | Required to validate core hypotheses; launch gate failures without it |
| **P1 — V1** | Required for public beta | Revenue generation; self-sustaining platform; public quality standards |
| **P2 — V2** | General Availability | Personalization flywheel; retention; NRR improvement |
| **P3 — V3** | Enterprise Platform | Ecosystem play; $10K+ deal unlocking; partner channel |
| **EXP — Experimental** | Research & validate | Hypothesis-driven; A/B tested before commitment |

---

## 17.2 Feature-Level Prioritization

| Feature | Priority | Business Value | Eng Cost | AI Complexity | Ops Complexity | Risk |
|:--------|:---------|:---------------|:---------|:--------------|:---------------|:-----|
| Email/Google Auth | P0 | 🔴 Critical | Low | None | Low | Low |
| JWT + RLS Tenant Isolation | P0 | 🔴 Critical | Medium | None | Low | 🔴 High (data breach if wrong) |
| Listing CRUD | P0 | 🔴 Critical | Low | None | Low | Low |
| Vector Semantic Search (Stage 1+2) | P0 | 🔴 Critical | High | Medium | Medium | Medium |
| LLM Content Moderation | P0 | 🔴 Critical | Medium | High | Low | Medium (false positives) |
| Basic Trust Score | P0 | High | Low | Low | Low | Low |
| WebSocket Notifications | P0 | Medium | Medium | None | Low | Low |
| Token Quota Enforcement | P0 | High | Low | None | Low | Low |
| Stripe Subscription Billing | P1 | 🔴 Critical | High | None | Medium | Medium (billing errors) |
| Usage-Based Overage | P1 | High | Medium | None | Medium | Medium |
| Neural Re-Ranking (Stage 3) | P1 | High | High | 🔴 High | Medium | Medium |
| Personalization Fast Loop | P1 | High | High | High | Medium | Medium |
| Semantic Cache | P1 | High | Medium | Medium | Low | Low |
| Ad Auction Engine | P1 | Medium | High | Medium | High | Medium |
| Behavioral Anomaly Detection | P1 | High | Medium | Medium | Low | Low |
| Analytics Dashboard | P1 | High | High | Low | Medium | Low |
| Collaborative Filtering | P2 | High | 🔴 Very High | 🔴 Very High | High | High (data requirements) |
| Reviews & Ratings | P2 | High | Medium | Low | Medium | Low |
| SAML/SSO | P2 | High | High | None | Medium | Medium |
| LTV Modeling | P2 | Medium | High | High | Low | Low |
| Public API | P3 | 🔴 Critical | 🔴 Very High | None | 🔴 Very High | High |
| Discovery-as-a-Service | P3 | High | 🔴 Very High | High | 🔴 Very High | High |
| Multi-Region | P3 | High | 🔴 Very High | None | 🔴 Very High | 🔴 High |
| AI Lead Scoring | EXP | Medium | Medium | High | Low | Medium |
| Conversational Search | EXP | Medium | High | 🔴 Very High | Medium | High |

---

# 18. FINAL PRODUCT MAP

---

## 18.1 Complete Capability Map

```
AI-NATIVE MULTI-TENANT MARKETPLACE OPERATING SYSTEM
│
├── IDENTITY & AUTH
│   ├── Email/Password Auth .................. MVP
│   ├── Google OAuth ........................ MVP
│   ├── Magic Link .......................... V1
│   ├── MFA (TOTP) .......................... V1
│   ├── SAML/SSO ........................... V2
│   ├── SCIM Provisioning ................... V3
│   └── API Key Auth ........................ V1
│
├── TENANT MANAGEMENT
│   ├── Org Provisioning .................... MVP
│   ├── RBAC Role System .................... MVP
│   ├── Custom Domains ...................... V1
│   ├── Feature Flags ....................... MVP (admin-only)
│   ├── Plan Enforcement .................... MVP
│   └── Branch Workspaces ................... V1
│
├── MARKETPLACE
│   ├── Listing CRUD ........................ MVP
│   ├── Listing Status Workflow .............. MVP
│   ├── Media Management .................... MVP
│   ├── Category Taxonomy ................... MVP (2-level)
│   ├── Bulk Import ......................... V1
│   ├── Listing Versioning .................. V2
│   ├── Custom Attributes ................... V2
│   ├── Reviews & Ratings ................... V2
│   └── Lead Management ..................... MVP
│
├── DISCOVERY
│   ├── Stage 1: Vector Retrieval ............ MVP
│   ├── Stage 2: Light Ranking ............... MVP
│   ├── BM25 Keyword Fallback ................ MVP
│   ├── Faceted Filtering ................... MVP
│   ├── Typeahead Suggestions ................ MVP
│   ├── Stage 3: Neural Re-Ranking ........... V1
│   ├── Stage 4: Exploration Injection ....... V1
│   ├── Personalized Feed ................... V1
│   ├── Preference Fast Loop ................ V1
│   ├── Collaborative Filtering .............. V2
│   └── Location-Based Discovery ............. V2
│
├── AI SYSTEMS
│   ├── Embedding Generation ................. MVP
│   ├── LLM Content Moderation ............... MVP
│   ├── Token Guard ......................... MVP
│   ├── AI Priority Queue ................... MVP
│   ├── Semantic Cache ...................... V1
│   ├── Multi-Provider Fallback .............. V1
│   ├── Listing Enrichment .................. V1
│   ├── Auto-Tagging ........................ V1
│   ├── Lead Scoring ........................ V2 (EXP)
│   ├── Local Model Execution ................ V2
│   └── Custom Fine-Tuning .................. V3
│
├── ANALYTICS
│   ├── Token Usage Meter ................... MVP
│   ├── Inquiry Volume ....................... MVP
│   ├── Feed Impressions .................... MVP
│   ├── Listing Performance Dashboard ........ V1
│   ├── Discovery Analytics ................. V1
│   ├── Conversion Funnel ................... V1
│   ├── Revenue Analytics (MRR/ARR) .......... V1
│   ├── Cohort Analysis ..................... V2
│   ├── LTV Modeling ........................ V2
│   ├── Attribution Model ................... V2
│   └── Data-Driven Attribution .............. V3
│
├── BILLING & MONETIZATION
│   ├── Fixed Plan Limits ................... MVP
│   ├── Manual Billing ...................... MVP
│   ├── Stripe Subscription ................. V1
│   ├── Usage-Based Billing ................. V1
│   ├── Credit Top-Up ....................... V1
│   ├── Ad Auction Engine (CPC) .............. V1
│   ├── Billing Portal ...................... V1
│   └── Invoice PDF Generation .............. V1
│
├── TRUST & SAFETY
│   ├── Pre-Publish LLM Scan ................ MVP
│   ├── Auto-Quarantine ..................... MVP
│   ├── Moderation Queue .................... MVP
│   ├── Basic Trust Score ................... MVP
│   ├── Behavioral Anomaly Detection ......... V1
│   ├── Trust Score Decay ................... V1
│   ├── Appeals System ...................... V1
│   ├── IP/Device Fingerprinting ............. V1
│   ├── Complex Fraud Scoring ................ V2
│   └── Seller Verification Tiers ............ V2
│
├── NOTIFICATIONS & REALTIME
│   ├── WebSocket Push (listing status) ...... MVP
│   ├── WebSocket Push (quota warning) ....... MVP
│   ├── Email (transactional) ................ MVP
│   ├── In-App Notification Feed ............. V1
│   ├── Email Digest ........................ V1
│   └── Live View Counters .................. V2
│
└── GOVERNANCE (ADMIN)
    ├── Global Platform Dashboard ............ MVP
    ├── Tenant Management ................... MVP
    ├── Moderation Console .................. MVP
    ├── Audit Log ........................... MVP
    ├── AI Control Center ................... MVP
    ├── Feature Flag Controls ................ MVP
    ├── Billing Ledger ...................... V1
    ├── A/B Experiment Management ............ V1
    └── Schema Migration Tools ............... MVP
```

---

## 18.2 Complete Feature Map (Version Rollup)

| Domain | MVP Features | V1 Additions | V2 Additions | V3 Additions |
|:-------|:------------|:-------------|:-------------|:-------------|
| **Identity** | 2 auth methods, JWT, RBAC | MFA, API keys, Magic link | SAML/SSO | SCIM, YubiKey |
| **Tenant** | Org provisioning, plan enforcement | Custom domains, branch workspaces | White-label theming | Multi-region data residency |
| **Marketplace** | Full listing CRUD, categories, lead mgmt | Bulk import, appeals | Reviews, versioning, custom attributes | — |
| **Discovery** | Stage 1+2, keyword fallback, filtering | Stage 3+4, personalization, fast loop | Collaborative filtering, geo | Discovery-as-a-Service |
| **AI** | Embeddings, moderation, token guard | Semantic cache, enrichment, fallback | Local models, lead scoring | Fine-tuning, AI marketplace API |
| **Analytics** | Token meter, inquiry volume | Full dashboards, funnel, revenue | Cohort, LTV, attribution | Data-driven attribution |
| **Billing** | Fixed limits, manual billing | Stripe subscription, usage billing, ads | Trial periods, auto-reload | Partner billing |
| **Trust** | LLM scan, basic trust score | Behavioral anomaly, decay, appeals | Complex ML fraud, verification tiers | Compliance automation |
| **Admin** | Platform dashboard, moderation, audit | Billing ledger, experiments | Advanced analytics | Ecosystem governance |

---

## 18.3 Complete Screen Map

```
PUBLIC PLANE
├── / ................................. Landing Page
├── /marketplace ...................... Category Browse
├── /marketplace/[category] ........... Category Detail
├── /search ........................... Search Results
├── /listing/[id] ..................... Listing Detail
├── /pricing .......................... Pricing Page
├── /login ............................ Login
├── /register ......................... Registration + Onboarding
├── /forgot-password .................. Forgot Password
└── /reset-password/[token] ........... Password Reset

TENANT PLANE (/app)
├── /app/overview ..................... Overview Dashboard
├── /app/listings ..................... Listing Management
├── /app/listings/new ................. Create Listing
├── /app/listings/[id]/edit ........... Edit Listing
├── /app/messages ..................... Message Center
├── /app/analytics .................... Analytics Dashboard (V1)
├── /app/team ......................... Team Management
├── /app/billing ...................... Billing & Subscription
├── /app/settings ..................... Settings
├── /app/settings/security ............ Security (MFA, API keys)
├── /app/settings/domain .............. Custom Domain (V1)
└── /app/settings/customization ....... Branding/White-label (V2)

SUPER ADMIN PLANE (/super-admin)
├── /super-admin/dashboard ............ Global KPI Dashboard
├── /super-admin/tenants .............. Tenant Management
├── /super-admin/tenants/[id] ......... Tenant Detail
├── /super-admin/moderation ........... Moderation Queue
├── /super-admin/ai-control ........... AI Control Center
├── /super-admin/billing .............. Platform Billing Ledger
├── /super-admin/settings ............. Platform Config
└── /super-admin/audit ................ Audit Log
```

---

## 18.4 Complete User Journey Summary

| Journey | Entry Point | Exit Point | Key Conversion | Primary Metric |
|:--------|:-----------|:-----------|:---------------|:---------------|
| **Buyer: Visitor to Lead** | Landing page | Inquiry submitted | Registration → Contact | Inquiry conversion rate |
| **Buyer: Lead to Retention** | Inquiry | Return visit | Transaction (V2) | 30-day retention |
| **Seller: Registration to First Listing** | Register | Listing active | First listing published | Time-to-active |
| **Seller: Listing to Lead** | Active listing | Inquiry received | Listing CTR | Inquiry volume |
| **Agent: Lead to Conversion** | Inquiry received | Deal closed | Lead qualified | Conversion rate |
| **Company: Onboard to Full Setup** | Register | 5+ listings + team | Listing portfolio growth | Activation rate |
| **Super Admin: Alert to Resolution** | Alert triggered | Incident resolved | Moderation decision | Resolution time |

---

## 18.5 Complete Domain Ownership Map

| Capability Area | Domain Owner | Engineering Team | PM Owner | Design Owner |
|:----------------|:-------------|:-----------------|:---------|:-------------|
| Authentication & Sessions | Identity | Auth Squad | Platform PM | Platform Design |
| Tenant & Organization | Tenant | Platform Core | Platform PM | Platform Design |
| Listing Management | Marketplace | Marketplace Squad | Marketplace PM | Marketplace Design |
| Discovery & Search | Discovery | Discovery Squad | Discovery PM | Discovery Design |
| AI Gateway & Models | AI Infrastructure | AI Squad | AI PM | — |
| Personalization | Marketplace Intelligence | AI Squad | AI PM | Discovery Design |
| Analytics & Reporting | Analytics | Data Squad | Analytics PM | Analytics Design |
| Billing & Payments | Monetization | Billing Squad | Growth PM | Platform Design |
| Trust & Safety | Trust & Safety | Trust Squad | Trust PM | Platform Design |
| Realtime & WebSockets | Realtime Infrastructure | Platform Core | Platform PM | — |
| Governance & Admin | Governance | Platform Core | Platform PM | Admin Design |
| Observability | Observability | SRE | SRE Lead | — |

---

## 18.6 Final System Product Structure

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    AI-NATIVE MARKETPLACE OPERATING SYSTEM                    ║
║                        MASTER FEATURE INVENTORY STATUS                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Domains Inventoried:       12 Domains                                        ║
║  Capabilities Mapped:       48 Capability Groups                              ║
║  Features Catalogued:       150+ Features                                     ║
║  Subfeatures Specified:     400+ Subfeatures                                  ║
║  Roles Defined:             14 Personas                                        ║
║  Screens Specified:         30+ Screens                                        ║
║  User Journeys Mapped:      5 Complete End-to-End Journeys                    ║
║  AI Features Catalogued:    11 AI Systems                                      ║
║  Analytics Features:        28 Analytics Features                              ║
║  Billing Features:          22 Billing Features                                ║
║  Trust Features:            18 Trust & Safety Features                         ║
║                                                                               ║
║  MVP Features:              26 Core Features                                   ║
║  V1 Features:               22 Additional Features                             ║
║  V2 Features:               18 Additional Features                             ║
║  V3 Features:               12 Platform Features                               ║
║  Experimental:              4 Research Features                                ║
║                                                                               ║
║  Document Status:           ✅ COMPLETE — Single Source of Truth              ║
║  Next Step:                 PM teams begin PRD authoring                       ║
║                             Engineering teams begin sprint planning            ║
║                             UX teams begin wireframe design                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Document Revision History

| Version | Date | Author | Summary |
|:--------|:-----|:-------|:--------|
| 1.0.0 | 2026-05-30 | Architecture Board | Initial complete document — all 18 sections |

---

*This document is the single source of truth for the AI-Native Multi-Tenant Marketplace Operating System product capability set. It derives from and is consistent with [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) (Platform Constitution) and the full 20-specification engineering blueprint located in [docs/specs/](file:///home/mohal665544/pr1/docs/specs/).*
