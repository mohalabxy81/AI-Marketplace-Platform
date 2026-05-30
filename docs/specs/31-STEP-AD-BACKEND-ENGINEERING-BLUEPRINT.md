# SPEC 31 — BACKEND ENGINEERING BLUEPRINT
## AI-Adaptive Marketplace Operating System

> **Status**: Sealed — Engineering-Ready
> **Version**: 1.0.0
> **Date**: 2026-05-31
> **Applies To**: All backend engineering teams, AI coding agents
> **Basis**: Specs 01–30, Supabase Blueprint (docs/supabase/01–18), DB Evolution Design (Spec 22)
> **Stack**: Supabase · PostgreSQL 15+ · pgvector · Deno Edge Functions · Realtime · Storage · OpenAI

---

## SECTION 1 — BACKEND ARCHITECTURE

### 1.1 System Architecture Overview

The AI-Adaptive Marketplace is a **Hybrid Modular Monolith** backed by a unified Supabase data plane. All business logic executes in one of three tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                         │
│   Next.js 15 (RSC + Client)  │  Mobile App  │  External API Consumers       │
└────────────────┬────────────────────────────────────────────────────────────┘
                 │ HTTPS / WSS
┌────────────────▼────────────────────────────────────────────────────────────┐
│                          API TIER                                            │
│  Next.js API Routes (BFF)  │  PostgREST (Auto REST)  │  Edge Functions      │
│  - Business orchestration  │  - Direct CRUD          │  - Async workers     │
│  - Multi-step workflows    │  - Auth context set      │  - AI proxy          │
│  - Rate limit enforcement  │  - RLS enforced          │  - Webhook ingest    │
└────────────────┬────────────────────────────────────────────────────────────┘
                 │ SQL / SDK
┌────────────────▼────────────────────────────────────────────────────────────┐
│                          DATA TIER                                           │
│  PostgreSQL 15+   │  pgvector  │  PgBouncer  │  Supabase Realtime           │
│  ├── 15 schemas   │  HNSW idx  │  Pool: 200  │  Elixir Phoenix              │
│  ├── RLS all tbl  │  1536-dim  │  Tx mode    │  CDC + Broadcast             │
│  └── pg_cron jobs │  Cosine    │             │  Presence                    │
└──────────────────────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
│  OpenAI API  │  Stripe  │  Resend (Email)  │  Twilio (SMS)  │  S3 Storage   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Context Diagram

```
[Guest/User/Vendor/Agency]
        │
        ▼
[Next.js BFF + Middleware]  ──────────────────────────────────────┐
        │                                                          │
        ├─► [PostgREST API] ──► [PostgreSQL + RLS]                │
        │         │                      │                         │
        │         │              [15 Domain Schemas]               │
        │         │              ├── identity                      │
        │         │              ├── marketplace                   │
        │         │              ├── discovery                     │
        │         │              ├── crm                           │
        │         │              ├── ai                            │
        │         │              ├── intelligence                  │
        │         │              ├── monetization                  │
        │         │              ├── trust                         │
        │         │              ├── analytics                     │
        │         │              ├── governance                    │
        │         │              ├── communication                 │
        │         │              ├── support                       │
        │         │              └── outbox                        │
        │         │                                                 │
        ├─► [Edge Functions] ──────────────────────────────────────┘
        │    ├── auth-context (JWT enrichment)
        │    ├── ai-embed (listing vectorization)
        │    ├── ai-inference (LLM proxy + quota)
        │    ├── stripe-webhook (billing events)
        │    ├── outbox-processor (event routing)
        │    ├── moderation-scan (content safety)
        │    ├── search (hybrid vector + keyword)
        │    └── telemetry-ingest (analytics batch)
        │
        └─► [Supabase Realtime] ──► [Client WebSocket]
             ├── CDC (Postgres WAL)
             ├── Broadcast (ephemeral)
             └── Presence
```

### 1.3 Backend Components

| Component | Technology | Primary Responsibility | Scaling Model |
|:---|:---|:---|:---|
| **API Gateway** | Next.js API Routes + PostgREST | HTTP routing, auth extraction, rate limiting | Horizontal (Vercel serverless) |
| **Database** | PostgreSQL 15+ on Supabase | All persistent state, RLS enforcement | Vertical + Read replicas |
| **Connection Pooler** | PgBouncer (Transaction mode) | Prevent connection exhaustion from serverless | Pool of 200 connections |
| **Edge Compute** | Deno on Supabase Edge | Async workers, AI proxy, webhooks | Automatic (Deno Deploy) |
| **Vector Store** | pgvector (HNSW index) | Semantic similarity search | RAM-bound vertical scale |
| **Realtime Bus** | Supabase Realtime (Elixir) | WebSocket state sync, CDC, presence | Horizontal Elixir cluster |
| **Object Storage** | Supabase Storage (S3-backed) | Media, documents, AI artifacts | S3 unlimited |
| **Cache** | Redis (Upstash or Supabase) | Quota state, session cache, rate limiting | Horizontal cluster |
| **Scheduler** | pg_cron (PostgreSQL extension) | Recurring background jobs | Single scheduler on primary |

### 1.4 Service Boundaries

```
IDENTITY BOUNDARY          MARKETPLACE BOUNDARY       AI BOUNDARY
┌──────────────┐           ┌──────────────────┐      ┌────────────────┐
│ identity     │           │ marketplace      │      │ ai             │
│ ├─ profiles  │──────────►│ ├─ listings      │─────►│ ├─ embeddings  │
│ ├─ members   │           │ ├─ categories    │      │ ├─ cache       │
│ └─ sessions  │           │ ├─ media         │      │ ├─ prompts     │
└──────────────┘           │ ├─ attributes    │      │ └─ logs        │
                           │ └─ interactions  │      └────────────────┘
MONETIZATION BOUNDARY      └──────────────────┘
┌──────────────┐           DISCOVERY BOUNDARY         TRUST BOUNDARY
│ monetization │           ┌──────────────────┐      ┌────────────────┐
│ ├─ ledger    │           │ discovery        │      │ trust          │
│ ├─ invoices  │◄──────────│ ├─ search_logs   │      │ ├─ moderation  │
│ └─ quotas    │           │ ├─ feed_cache    │      │ ├─ fraud       │
└──────────────┘           │ └─ impressions   │      │ └─ scores      │
                           └──────────────────┘      └────────────────┘
```

### 1.5 Canonical Data Flow — Listing Creation

```
1. Vendor submits form  ──► Next.js API Route
2. Validate input (Zod)
3. Quota check via Redis (listing slots remaining)
4. INSERT into marketplace.listings (status=DRAFT)
5. INSERT into outbox.events ('listing_created') ──── SAME TRANSACTION ────┐
6. HTTP 201 returned to client                                              │
                                                                            ▼
7. Supabase DB Webhook fires ──► outbox-processor Edge Function
8. Fan-out:
   ├── ai-embed     ──► OpenAI Embedding API ──► INSERT ai.embeddings
   ├── mod-scan     ──► OpenAI Moderation API ──► INSERT trust.moderation_queue
   └── analytics    ──► INSERT analytics.raw_events
9. If mod passes: UPDATE listings SET status='ACTIVE'
10. Realtime CDC ──► Client sees listing go live
```

---

## SECTION 2 — DATABASE ENGINEERING

### 2.1 Schema Ownership Map

| Schema | Owner Domain | Table Count (approx) | RLS |
|:---|:---|:---|:---|
| `auth` | Supabase GoTrue (immutable) | 5 | Supabase-managed |
| `platform` | Company/Tenant Service | 4 | Strict |
| `identity` | Identity Service | 5 | Strict |
| `marketplace` | Listing Service | 8 | Strict |
| `discovery` | Search/Recommendation Service | 5 | Strict |
| `crm` | CRM/Lead Service | 4 | Strict |
| `communication` | Messaging/Notification Service | 5 | Strict |
| `ai` | AI Service | 5 | Strict (service_role write) |
| `intelligence` | Trust/Recommendation Service | 4 | Strict |
| `monetization` | Billing/Quota Service | 6 | Strict (read only for tenants) |
| `trust` | Trust/Moderation Service | 5 | Strict |
| `analytics` | Analytics Service | 4 | Strict (write=service_role) |
| `governance` | Audit/Super Admin | 3 | Append-only |
| `support` | Support Service | 3 | Strict |
| `outbox` | Event Mesh | 2 | Service role only |

---

### 2.2 `identity.user_profiles`

**Purpose**: Extended user data beyond GoTrue's `auth.users`. Stores all platform-level attributes, trust indicators, and preferences.

```
Columns:
  id                UUID          PK, FK auth.users(id) ON DELETE CASCADE
  tenant_id         UUID          NOT NULL, FK platform.tenants(id)
  email             TEXT          NOT NULL
  display_name      TEXT
  avatar_url        TEXT
  phone             TEXT
  phone_verified_at TIMESTAMPTZ
  bio               TEXT          max 500 chars
  website_url       TEXT
  trust_score       FLOAT         DEFAULT 0.5, range 0.0–1.0
  status            TEXT          DEFAULT 'active'  -- active | suspended | deleted
  role              TEXT          DEFAULT 'user'     -- user | vendor | agency | admin | super_admin
  last_active_at    TIMESTAMPTZ
  metadata          JSONB         DEFAULT '{}'
  created_at        TIMESTAMPTZ   DEFAULT NOW()
  updated_at        TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  UNIQUE(tenant_id, email)
  CHECK(trust_score BETWEEN 0.0 AND 1.0)
  CHECK(status IN ('active','suspended','deleted'))
  CHECK(role IN ('user','vendor','agency','admin','super_admin'))

Indexes:
  PRIMARY KEY (id)
  idx_profiles_tenant_email    (tenant_id, email)         -- Unique login lookup
  idx_profiles_tenant_status   (tenant_id, status)        -- Admin queries
  idx_profiles_trust_score     (tenant_id, trust_score)   -- Ranking / moderation

Soft Delete:
  status = 'deleted', deleted_at TIMESTAMPTZ set.
  RLS hides deleted profiles from all non-admin queries.

Partitioning: None (row count expected < 50M per tenant group)
```

---

### 2.3 `identity.tenant_members`

**Purpose**: Maps users to tenants and defines RBAC role within that tenant. A user may exist in multiple tenants with different roles.

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  tenant_id       UUID          NOT NULL, FK platform.tenants(id)
  user_id         UUID          NOT NULL, FK identity.user_profiles(id)
  role            TEXT          NOT NULL DEFAULT 'member'
                                -- owner | admin | manager | agent | viewer | member
  invited_by      UUID          FK identity.user_profiles(id)
  invitation_token TEXT         (nullable, cleared on acceptance)
  status          TEXT          DEFAULT 'active'  -- active | invited | suspended | removed
  joined_at       TIMESTAMPTZ
  created_at      TIMESTAMPTZ   DEFAULT NOW()
  updated_at      TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  UNIQUE(tenant_id, user_id)
  CHECK(role IN ('owner','admin','manager','agent','viewer','member'))
  CHECK(status IN ('active','invited','suspended','removed'))

Indexes:
  PRIMARY KEY (id)
  idx_members_tenant_user   (tenant_id, user_id)    -- Membership lookup (unique)
  idx_members_tenant_role   (tenant_id, role)        -- Role-based queries
  idx_members_invitation    (invitation_token)       -- PARTIAL WHERE invitation_token IS NOT NULL
```

---

### 2.4 `platform.tenants`

**Purpose**: Master directory of marketplace operator organizations. Each tenant is an isolated marketplace instance.

```
Columns:
  id                  UUID          PK DEFAULT gen_random_uuid()
  slug                TEXT          UNIQUE NOT NULL  -- URL-safe identifier
  name                TEXT          NOT NULL
  domain              TEXT          UNIQUE            -- Custom domain
  logo_url            TEXT
  brand_primary_color TEXT          DEFAULT '#6366F1'
  plan_tier           TEXT          DEFAULT 'starter' -- starter|growth|premium|enterprise
  status              TEXT          DEFAULT 'active'  -- active|suspended|archived
  stripe_customer_id  TEXT          UNIQUE
  settings            JSONB         DEFAULT '{}'
  feature_flags       JSONB         DEFAULT '{}'
  created_at          TIMESTAMPTZ   DEFAULT NOW()
  updated_at          TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  CHECK(plan_tier IN ('starter','growth','premium','enterprise'))
  CHECK(status IN ('active','suspended','archived'))
  slug format: ^[a-z0-9-]+$

Indexes:
  PRIMARY KEY (id)
  idx_tenants_slug      (slug)           -- Unique routing
  idx_tenants_domain    (domain)         -- Custom domain resolution
  idx_tenants_status    (status)         -- Admin filtering
```

---

### 2.5 `marketplace.listings`

**Purpose**: Core entity for all marketplace inventory — Real Estate, Products, Services, Offers. Unified across all module types via a `listing_type` discriminator.

```
Columns:
  id                UUID          PK DEFAULT gen_random_uuid()
  tenant_id         UUID          NOT NULL FK platform.tenants(id)
  seller_id         UUID          NOT NULL FK identity.user_profiles(id)
  category_id       UUID          FK marketplace.categories(id)
  listing_type      TEXT          NOT NULL
                                  -- real_estate | product | service | offer
  title             TEXT          NOT NULL  max 300 chars
  description       TEXT          max 10000 chars
  price             DECIMAL(12,2)
  price_currency    TEXT          DEFAULT 'USD'
  price_type        TEXT          DEFAULT 'fixed'  -- fixed|negotiable|contact|free
  location_address  TEXT
  location_city     TEXT
  location_country  TEXT          DEFAULT 'US'
  location_lat      DECIMAL(9,6)
  location_lng      DECIMAL(9,6)
  status            TEXT          DEFAULT 'draft'
                                  -- draft|pending_review|active|archived|suspended|rejected
  quality_score     FLOAT         DEFAULT 0.0   -- AI-calculated completeness
  trust_score       FLOAT         DEFAULT 0.5   -- Derived from seller trust
  view_count        INTEGER       DEFAULT 0
  save_count        INTEGER       DEFAULT 0
  attributes        JSONB         DEFAULT '{}'  -- Type-specific fields
  tags              TEXT[]        DEFAULT '{}'
  is_featured       BOOLEAN       DEFAULT false
  is_sponsored      BOOLEAN       DEFAULT false
  featured_until    TIMESTAMPTZ
  published_at      TIMESTAMPTZ
  archived_at       TIMESTAMPTZ
  deleted_at        TIMESTAMPTZ   -- Soft delete
  created_at        TIMESTAMPTZ   DEFAULT NOW()
  updated_at        TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  CHECK(listing_type IN ('real_estate','product','service','offer'))
  CHECK(status IN ('draft','pending_review','active','archived','suspended','rejected'))
  CHECK(price >= 0 OR price IS NULL)
  CHECK(location_lat BETWEEN -90 AND 90 OR location_lat IS NULL)
  CHECK(location_lng BETWEEN -180 AND 180 OR location_lng IS NULL)

Indexes:
  PRIMARY KEY (id)
  idx_listings_tenant_status    (tenant_id, status)
  idx_listings_tenant_seller    (tenant_id, seller_id)
  idx_listings_tenant_type      (tenant_id, listing_type, status)
  idx_listings_category         (category_id)
  idx_listings_location         USING GIST (location_lat, location_lng)  -- Geo search
  idx_listings_fts              USING GIN (to_tsvector('english', title || ' ' || COALESCE(description,'')))
  idx_listings_tags             USING GIN (tags)
  idx_listings_active_featured  (tenant_id, is_featured) WHERE status = 'active' AND is_featured = true
  idx_listings_created          (tenant_id, created_at DESC) WHERE deleted_at IS NULL

Partitioning: RANGE on created_at (monthly) when row count > 50M
Archiving: Listings with status='archived' AND archived_at < NOW()-'2 years' moved to cold partition
Soft Delete: deleted_at set; RLS excludes deleted rows from all queries
```

---

### 2.6 `marketplace.listing_media`

**Purpose**: All media assets (images, videos, documents) associated with a listing.

```
Columns:
  id                  UUID    PK DEFAULT gen_random_uuid()
  listing_id          UUID    NOT NULL FK marketplace.listings(id) ON DELETE CASCADE
  tenant_id           UUID    NOT NULL FK platform.tenants(id)
  storage_path        TEXT    NOT NULL  -- Supabase Storage path
  cdn_url             TEXT             -- Processed CDN URL
  media_type          TEXT    NOT NULL -- image | video | document | model_3d
  mime_type           TEXT    NOT NULL
  file_size_bytes     BIGINT
  width_px            INTEGER
  height_px           INTEGER
  duration_seconds    INTEGER          -- For video
  position            SMALLINT DEFAULT 0  -- Ordering
  is_primary          BOOLEAN DEFAULT false
  processing_status   TEXT    DEFAULT 'pending' -- pending|processing|complete|failed
  alt_text            TEXT
  created_at          TIMESTAMPTZ DEFAULT NOW()

Constraints:
  CHECK(media_type IN ('image','video','document','model_3d'))
  CHECK(processing_status IN ('pending','processing','complete','failed'))
  Only one row per listing_id may have is_primary = true  (partial unique index)

Indexes:
  idx_media_listing       (listing_id, position)
  idx_media_primary       (listing_id) WHERE is_primary = true   -- Partial unique
  idx_media_processing    (processing_status) WHERE processing_status = 'pending'
```

---

### 2.7 `marketplace.categories`

**Purpose**: Hierarchical taxonomy tree for all listing types.

```
Columns:
  id            UUID    PK DEFAULT gen_random_uuid()
  tenant_id     UUID    NOT NULL FK platform.tenants(id)
  parent_id     UUID    FK marketplace.categories(id) ON DELETE SET NULL
  listing_type  TEXT    NOT NULL  -- Which module this category belongs to
  name          TEXT    NOT NULL
  slug          TEXT    NOT NULL
  icon          TEXT             -- Icon identifier
  description   TEXT
  sort_order    SMALLINT DEFAULT 0
  is_active     BOOLEAN DEFAULT true
  metadata      JSONB   DEFAULT '{}'
  created_at    TIMESTAMPTZ DEFAULT NOW()

Constraints:
  UNIQUE(tenant_id, slug)
  Prevent self-referencing parent_id = id (CHECK or trigger)

Indexes:
  idx_categories_tenant_type  (tenant_id, listing_type, is_active)
  idx_categories_parent       (parent_id)
  idx_categories_slug         (tenant_id, slug)
```

---

### 2.8 `marketplace.favorites`

**Purpose**: Tracks listings saved/bookmarked by users.

```
Columns:
  id            UUID          PK DEFAULT gen_random_uuid()
  tenant_id     UUID          NOT NULL FK platform.tenants(id)
  user_id       UUID          NOT NULL FK identity.user_profiles(id)
  listing_id    UUID          NOT NULL FK marketplace.listings(id) ON DELETE CASCADE
  created_at    TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  UNIQUE(tenant_id, user_id, listing_id)

Indexes:
  idx_favorites_user      (tenant_id, user_id, created_at DESC)  -- User's saved list
  idx_favorites_listing   (listing_id)                           -- Count saves per listing
```

---

### 2.9 `marketplace.reviews`

**Purpose**: Buyer reviews and ratings for listings and sellers.

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  tenant_id       UUID          NOT NULL FK platform.tenants(id)
  listing_id      UUID          FK marketplace.listings(id) ON DELETE CASCADE
  seller_id       UUID          NOT NULL FK identity.user_profiles(id)
  reviewer_id     UUID          NOT NULL FK identity.user_profiles(id)
  rating          SMALLINT      NOT NULL  -- 1-5
  title           TEXT          max 150 chars
  body            TEXT          max 2000 chars
  status          TEXT          DEFAULT 'pending'  -- pending|approved|rejected|hidden
  is_verified     BOOLEAN       DEFAULT false  -- Verified purchase
  helpful_count   INTEGER       DEFAULT 0
  reported_count  INTEGER       DEFAULT 0
  moderation_note TEXT
  created_at      TIMESTAMPTZ   DEFAULT NOW()
  updated_at      TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  CHECK(rating BETWEEN 1 AND 5)
  CHECK(status IN ('pending','approved','rejected','hidden'))
  UNIQUE(tenant_id, listing_id, reviewer_id)  -- One review per listing per user

Indexes:
  idx_reviews_listing     (listing_id, status, created_at DESC)
  idx_reviews_seller      (seller_id, status)
  idx_reviews_reviewer    (reviewer_id)
  idx_reviews_pending     (tenant_id, status) WHERE status = 'pending'
```

---

### 2.10 `discovery.search_logs`

**Purpose**: Records all search queries for analytics, autocomplete training, and zero-result analysis.

```
Columns:
  id                  UUID          PK DEFAULT gen_random_uuid()
  tenant_id           UUID          NOT NULL FK platform.tenants(id)
  user_id             UUID          FK identity.user_profiles(id)  -- NULL for anonymous
  session_id          UUID          NOT NULL
  query_raw           TEXT          NOT NULL
  query_normalized    TEXT          NOT NULL
  listing_type_filter TEXT
  filters_applied     JSONB         DEFAULT '{}'
  result_count        INTEGER
  top_result_id       UUID
  search_type         TEXT          DEFAULT 'keyword'  -- keyword|semantic|hybrid
  latency_ms          INTEGER
  zero_result         BOOLEAN       DEFAULT false
  clicked_result_id   UUID          -- Which result the user clicked (nullable)
  created_at          TIMESTAMPTZ   DEFAULT NOW()

Partitioning: RANGE on created_at (monthly)
Indexes:
  idx_search_tenant_date    (tenant_id, created_at DESC)
  idx_search_zero_result    (tenant_id, zero_result) WHERE zero_result = true
  idx_search_user           (user_id, created_at DESC) WHERE user_id IS NOT NULL
```

---

### 2.11 `analytics.raw_events`

**Purpose**: High-throughput event sink for all platform telemetry. Partitioned by month.

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  tenant_id       UUID          NOT NULL FK platform.tenants(id)
  user_id         UUID          (nullable — anonymous events allowed)
  session_id      UUID          NOT NULL
  event_type      TEXT          NOT NULL  -- page_view | listing_view | click | search | etc.
  resource_type   TEXT          -- listing | category | user | etc.
  resource_id     UUID
  payload         JSONB         DEFAULT '{}'  -- Event-specific data
  ip_hash         TEXT          -- SHA-256 hashed for GDPR
  user_agent      TEXT
  referrer        TEXT
  created_at      TIMESTAMPTZ   DEFAULT NOW()  -- Partition key

Partitioning: RANGE (created_at) — monthly partitions
  analytics.raw_events_2026_05, _2026_06, etc.
  Partition pruning automatically applied on date-range queries.

Retention: 90 days in hot Postgres partitions.
  Older partitions archived to S3 via pg_cron job.

Indexes (per partition):
  idx_events_tenant_type_date   (tenant_id, event_type, created_at)
  idx_events_resource           (resource_id) WHERE resource_id IS NOT NULL
  idx_events_user_session       (user_id, session_id) WHERE user_id IS NOT NULL
```

---

### 2.12 `governance.audit_logs`

**Purpose**: Immutable, compliance-grade audit trail for all sensitive operations.

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  occurred_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  actor_id        UUID          NOT NULL  -- User or Service performing action
  actor_type      TEXT          NOT NULL  -- USER | SERVICE | SYSTEM | ADMIN
  tenant_id       UUID          -- NULL for platform-level actions
  action_category TEXT          NOT NULL  -- AUTH | LISTING | BILLING | TRUST | ADMIN | DATA
  action_type     TEXT          NOT NULL  -- e.g., 'listing.published', 'tenant.suspended'
  target_entity   TEXT
  target_id       UUID
  before_state    JSONB         -- Sensitive fields masked
  after_state     JSONB
  ip_hash         TEXT
  trace_id        TEXT
  metadata        JSONB

Immutability Enforcement:
  CREATE RULE no_update_audit AS ON UPDATE TO governance.audit_logs DO INSTEAD NOTHING;
  CREATE RULE no_delete_audit AS ON DELETE TO governance.audit_logs DO INSTEAD NOTHING;

Partitioning: RANGE (occurred_at) — monthly
Retention: 7 years (regulatory compliance)

Indexes:
  idx_audit_actor       (actor_id, occurred_at DESC)
  idx_audit_tenant      (tenant_id, occurred_at DESC)
  idx_audit_action      (action_category, action_type, occurred_at DESC)
  idx_audit_target      (target_entity, target_id, occurred_at DESC)
```

---

### 2.13 `ai.embeddings`

**Purpose**: Vector embeddings for all embeddable entities (listings, user preferences, queries).

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  tenant_id       UUID          NOT NULL FK platform.tenants(id)
  entity_type     TEXT          NOT NULL  -- listing | user_preference | query | category
  entity_id       UUID          NOT NULL
  model_version   TEXT          NOT NULL  -- text-embedding-3-small-v1
  embedding       vector(1536)  NOT NULL
  content_hash    TEXT          NOT NULL  -- MD5 of source text; detect staleness
  chunk_index     SMALLINT      DEFAULT 0
  created_at      TIMESTAMPTZ   DEFAULT NOW()
  updated_at      TIMESTAMPTZ   DEFAULT NOW()

Constraints:
  UNIQUE(tenant_id, entity_type, entity_id, chunk_index, model_version)

Indexes:
  PRIMARY KEY (id)
  HNSW index:  USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)
  idx_embed_entity  (tenant_id, entity_type, entity_id)  -- Lookup by entity
  idx_embed_hash    (content_hash)                       -- Staleness detection
```

---

### 2.14 `outbox.events`

**Purpose**: Transactional outbox staging table. Written atomically with business transactions.

```
Columns:
  id              UUID          PK DEFAULT gen_random_uuid()
  tenant_id       UUID          NOT NULL
  event_type      TEXT          NOT NULL   -- domain.entity_action
  aggregate_type  TEXT          NOT NULL   -- listing | user | payment
  aggregate_id    UUID          NOT NULL
  payload         JSONB         NOT NULL
  status          TEXT          DEFAULT 'pending'  -- pending|processing|processed|failed
  retry_count     SMALLINT      DEFAULT 0
  next_retry_at   TIMESTAMPTZ   DEFAULT NOW()
  created_at      TIMESTAMPTZ   DEFAULT NOW()
  processed_at    TIMESTAMPTZ

Indexes:
  idx_outbox_pending    (next_retry_at) WHERE status = 'pending'  -- Polling query
  idx_outbox_aggregate  (aggregate_type, aggregate_id)
  idx_outbox_failed     (status) WHERE status = 'failed'
```

---

## SECTION 3 — DATABASE PERFORMANCE ENGINEERING

### 3.1 Query Optimization Standards

**Rule 1 — Index All Foreign Keys**: Every FK column MUST have an index. Violation discovered via `pg_stat_user_indexes`.

**Rule 2 — Avoid SELECT \***: All application queries MUST specify exact columns. PostgREST handles this via `select=` parameter.

**Rule 3 — Use EXPLAIN ANALYZE in CI**: A query lint step runs `EXPLAIN (ANALYZE, BUFFERS)` on all critical-path queries in the staging environment. Any query with `cost > 1000` triggers a review.

**Rule 4 — Prepared Statements**: PostgREST and PgBouncer use prepared statements. Edge Functions use parameterized queries exclusively.

### 3.2 Materialized Views

```sql
-- Daily listing performance summary (refreshed nightly by pg_cron)
CREATE MATERIALIZED VIEW analytics.mv_listing_daily_stats AS
SELECT
  l.tenant_id,
  l.id AS listing_id,
  l.title,
  DATE(e.created_at) AS stat_date,
  COUNT(*) FILTER (WHERE e.event_type = 'listing_view') AS views,
  COUNT(*) FILTER (WHERE e.event_type = 'listing_save') AS saves,
  COUNT(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
  COUNT(*) FILTER (WHERE e.event_type = 'lead_created') AS leads
FROM marketplace.listings l
JOIN analytics.raw_events e ON e.resource_id = l.id
WHERE e.created_at >= NOW() - INTERVAL '90 days'
GROUP BY l.tenant_id, l.id, l.title, DATE(e.created_at);

CREATE UNIQUE INDEX ON analytics.mv_listing_daily_stats(tenant_id, listing_id, stat_date);

-- Tenant KPI snapshot (refreshed hourly for dashboards)
CREATE MATERIALIZED VIEW analytics.mv_tenant_kpis AS
SELECT
  tenant_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_listings,
  COUNT(*) FILTER (WHERE status = 'pending_review') AS pending_listings,
  COUNT(DISTINCT seller_id) AS active_sellers
FROM marketplace.listings
WHERE deleted_at IS NULL
GROUP BY tenant_id;
```

### 3.3 Partial Indexes

```sql
-- Only index active listings for feed queries (reduces index size 60-70%)
CREATE INDEX idx_listings_active_feed ON marketplace.listings
  (tenant_id, created_at DESC, trust_score DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

-- Only index pending moderation items
CREATE INDEX idx_mod_queue_pending ON trust.moderation_queue
  (tenant_id, severity, created_at)
  WHERE status = 'pending';

-- Only index unread notifications
CREATE INDEX idx_notifications_unread ON communication.notifications
  (user_id, created_at DESC)
  WHERE read_at IS NULL;
```

### 3.4 GIN Indexes (Full-Text & Array Search)

```sql
-- Full-text search on listings
CREATE INDEX idx_listings_fts ON marketplace.listings
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Tag array search
CREATE INDEX idx_listings_tags ON marketplace.listings USING GIN (tags);

-- JSONB attribute search (e.g., attributes @> '{"bedrooms": 3}')
CREATE INDEX idx_listings_attributes ON marketplace.listings USING GIN (attributes jsonb_path_ops);
```

### 3.5 BRIN Indexes (Time-Series Tables)

```sql
-- BRIN for time-series tables (low maintenance cost, good for sequential data)
CREATE INDEX idx_raw_events_brin ON analytics.raw_events USING BRIN (created_at);
CREATE INDEX idx_audit_brin ON governance.audit_logs USING BRIN (occurred_at);
```

### 3.6 Connection Pooling Architecture

```
Configuration: PgBouncer in TRANSACTION mode
  max_client_conn   = 10,000   (serverless connections)
  default_pool_size = 200      (actual Postgres connections)
  max_db_connections = 200
  pool_mode         = transaction
  server_idle_timeout = 600

Connection Routing:
  App (PostgREST)  ──► PgBouncer Port 6543 ──► Postgres Port 5432
  Edge Functions   ──► PgBouncer Port 6543
  pg_cron jobs     ──► Direct Port 5432 (scheduler runs in Postgres)

Read Replica Routing:
  All SELECT queries for analytics/* and discovery/* pages ──► Read Replica
  All INSERT/UPDATE/DELETE ──► Primary
```

### 3.7 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|:---|:---|:---|:---|
| Tenant branding/settings | Redis | 5 min | On `PATCH /organizations/:id` |
| JWT claims / user role | Redis | 15 min | On role change event |
| Quota usage | Redis | 60 sec | Background flush every 5 min |
| Category tree | Redis | 30 min | On category update |
| Feed (personalized) | Redis | 5 min | On listing publish/archive |
| Search results | Redis | 2 min | On listing update in result set |
| AI embedding (semantic cache) | ai.semantic_cache (pgvector) | 24 hr | On cache TTL expiry |

---

## SECTION 4 — SUPABASE AUTH ENGINEERING

### 4.1 Auth Flow Architecture

```
STEP 1 — Initial Authentication (GoTrue)
User submits Magic Link / OAuth / Email+Password
  ──► GoTrue validates credentials
  ──► Issues access_token (JWT, 15-min TTL) + refresh_token (30-day TTL)
  ──► JWT contains: sub (user_id), email, aud, iss, exp
  ──► app_metadata is initially empty (no tenant context)

STEP 2 — Tenant Context Injection
Client calls POST /functions/v1/auth-context { tenant_id: "uuid" }
  ──► Edge Function validates the bare JWT (sub = user_id)
  ──► Queries identity.tenant_members WHERE user_id = sub AND tenant_id = ?
  ──► If membership found: calls supabase.auth.admin.updateUserById(sub, { app_metadata: { tenant_id, role } })
  ──► Client calls supabase.auth.refreshSession()
  ──► New JWT now carries tenant_id and role in app_metadata

STEP 3 — All Subsequent Requests
Client sends: Authorization: Bearer <enriched_jwt>
  ──► PostgREST parses JWT, sets:
        SET LOCAL request.jwt.claims = '<jwt_payload>';
        SET LOCAL request.jwt.user_id = '<sub>';
  ──► RLS policies read: current_setting('request.jwt.claims')::jsonb
  ──► All queries auto-scoped to tenant_id + role
```

### 4.2 JWT Structure

```json
{
  "iss": "https://<project>.supabase.co/auth/v1",
  "sub": "user-uuid",
  "aud": "authenticated",
  "exp": 1717027200,
  "iat": 1717023600,
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"],
    "tenant_id": "tenant-uuid",
    "role": "vendor"
  },
  "user_metadata": {
    "display_name": "John Doe"
  },
  "role": "authenticated"
}
```

### 4.3 Helper Functions (Stable — Evaluated Once Per Statement)

```sql
-- Extract active tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.jwt_tenant_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', ''
  )::uuid;
$$;

-- Extract role from JWT
CREATE OR REPLACE FUNCTION auth.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb
    -> 'app_metadata' ->> 'role';
$$;

-- Is the current JWT a Super Admin?
CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.jwt_role() = 'super_admin';
$$;

-- Is the current JWT at least admin level?
CREATE OR REPLACE FUNCTION auth.is_admin_or_above() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.jwt_role() IN ('owner', 'admin', 'super_admin');
$$;
```

### 4.4 Account Lifecycle

```
REGISTRATION:
  GoTrue creates auth.users record
  Trigger: create identity.user_profiles row
  Trigger: create default tenant membership if invited via token
  Event: identity.user_registered emitted to outbox

SUSPENSION:
  Admin PATCH /admin/users/:id { status: 'suspended' }
  UPDATE identity.user_profiles SET status = 'suspended'
  GoTrue admin API: revoke all active sessions
  Event: identity.account_suspended
  RLS: suspended users can still READ but not WRITE

DELETION (GDPR):
  Super Admin initiates deletion pipeline
  Async job: anonymize PII fields (name → [DELETED], email → hash)
  Soft delete: status = 'deleted', deleted_at = NOW()
  Hard delete after 30-day retention window (pg_cron)
  Storage: delete all associated media files
  Event: identity.account_deleted
```

---

## SECTION 5 — ROW LEVEL SECURITY ENGINEERING

### 5.1 The RLS Constitution

1. **Deny-by-Default Law**: `ALTER TABLE t ENABLE ROW LEVEL SECURITY; ALTER TABLE t FORCE ROW LEVEL SECURITY;` — no rows returned without an explicit ALLOW policy.
2. **STABLE Function Law**: All JWT helper functions marked `STABLE` — PostgreSQL evaluates once per statement, not per row.
3. **Index Law**: `tenant_id` and `user_id` columns on every RLS-protected table MUST be indexed.
4. **No Cross-Schema FK Subqueries in Policies**: Use joins in the query, not in the RLS policy itself.

### 5.2 Policy Matrix

```sql
-- ════════════════════════════════════════
-- marketplace.listings — Full Policy Suite
-- ════════════════════════════════════════

ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listings FORCE ROW LEVEL SECURITY;

-- ANONYMOUS: Can read active, non-deleted listings
CREATE POLICY "anon_read_active" ON marketplace.listings
  FOR SELECT TO anon
  USING (status = 'active' AND deleted_at IS NULL);

-- AUTHENTICATED (any): Can read active listings in their tenant
CREATE POLICY "auth_read_tenant_active" ON marketplace.listings
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND status = 'active' AND deleted_at IS NULL);

-- VENDOR: Can read ALL their own listings (any status)
CREATE POLICY "vendor_read_own" ON marketplace.listings
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND seller_id = auth.uid());

-- VENDOR: Can create listing for themselves
CREATE POLICY "vendor_insert" ON marketplace.listings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.jwt_tenant_id()
    AND seller_id = auth.uid()
    AND auth.jwt_role() IN ('vendor', 'agency', 'admin', 'owner', 'super_admin')
  );

-- VENDOR: Can update their own listing (cannot change tenant_id or seller_id)
CREATE POLICY "vendor_update_own" ON marketplace.listings
  FOR UPDATE TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND seller_id = auth.uid())
  WITH CHECK (tenant_id = auth.jwt_tenant_id() AND seller_id = auth.uid());

-- ADMIN: Can read, update, delete ALL listings in their tenant
CREATE POLICY "admin_all_tenant" ON marketplace.listings
  FOR ALL TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND auth.is_admin_or_above())
  WITH CHECK (tenant_id = auth.jwt_tenant_id() AND auth.is_admin_or_above());

-- SUPER ADMIN: Unrestricted (for platform moderation)
CREATE POLICY "superadmin_unrestricted" ON marketplace.listings
  FOR ALL TO authenticated
  USING (auth.is_super_admin())
  WITH CHECK (auth.is_super_admin());
```

### 5.3 Vendor / Agency Rules

```sql
-- Vendors can only see their own analytics data
CREATE POLICY "vendor_own_analytics" ON analytics.raw_events
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND user_id = auth.uid());

-- Admins see all analytics for their tenant
CREATE POLICY "admin_tenant_analytics" ON analytics.raw_events
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id() AND auth.is_admin_or_above());

-- Service role writes (no INSERT policy for authenticated role)
```

### 5.4 Security Edge Cases

| Scenario | Risk | Mitigation |
|:---|:---|:---|
| Tenant ID spoofing via JWT | Attacker modifies `app_metadata.tenant_id` in a forged JWT | JWT is RS256-signed by GoTrue private key. Cannot be modified without the key. |
| Missing RLS policy = full access | Missing policy returns ALL rows | `FORCE ROW LEVEL SECURITY` + deny-by-default means missing policy = zero rows |
| HNSW vector search cross-tenant | Vector search returns neighbors from other tenants | `ai.embeddings` has RLS; `match_listings` RPC explicitly filters by `auth.jwt_tenant_id()` |
| service_role bypass without audit | Edge Functions bypass RLS | All service_role operations MUST write to `governance.audit_logs` via trigger |
| Soft-delete bypass | Query for `deleted_at IS NULL` forgotten | RLS policy itself enforces `AND deleted_at IS NULL` on all SELECT policies |

---

## SECTION 6 — EDGE FUNCTION ENGINEERING CATALOG

### 6.1 `auth-context`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Inject active `tenant_id` and `role` into user's JWT `app_metadata` |
| **Trigger** | HTTP POST from client after login |
| **Input** | `{ tenant_id: UUID }` + `Authorization: Bearer <jwt>` |
| **Output** | `{ success: true }` — client must then call `supabase.auth.refreshSession()` |
| **Authorization** | Any authenticated user |
| **Rate Limit** | 10 req/min per user_id |
| **Timeout** | 5 seconds |
| **Retry** | Not retried (idempotent) |
| **Logging** | `{ user_id, tenant_id, role, duration_ms }` |

**Business Logic**:
1. Decode JWT to get `sub` (user_id)
2. Query `identity.tenant_members` for membership + role
3. If not found → 403 Forbidden
4. Call `supabase.auth.admin.updateUserById(sub, { app_metadata: { tenant_id, role } })`
5. Return 200

---

### 6.2 `outbox-processor`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Consume `outbox.events` and route events to appropriate handlers |
| **Trigger** | DB Webhook on `outbox.events INSERT` + pg_cron every 60s (catch-up) |
| **Input** | Single event record from `outbox.events` |
| **Output** | Updates `outbox.events.status` to `processed` or `failed` |
| **Authorization** | Service role only |
| **Concurrency** | `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100` (safe concurrent consumption) |
| **Retry** | Exponential backoff: 5s, 25s, 125s, 625s, 3125s (5 attempts) |
| **Dead Letter** | After 5 failures, status=`failed`, alert to `trust.alerts` |
| **Timeout** | 30 seconds per event batch |

**Routing Table**:
```typescript
const eventRouter: Record<string, Handler> = {
  'marketplace.listing_created':  [aiEmbedHandler, moderationHandler, analyticsHandler],
  'marketplace.listing_updated':  [aiReEmbedHandler, analyticsHandler],
  'marketplace.listing_published':[discoveryIndexHandler, notificationHandler],
  'monetization.invoice_paid':    [tenantActivateHandler, notificationHandler],
  'trust.content_approved':       [listingPublishHandler, notificationHandler],
  'trust.content_quarantined':    [listingHoldHandler, notificationHandler],
  'identity.user_registered':     [welcomeEmailHandler, analyticsHandler],
};
```

---

### 6.3 `ai-embed`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Generate and store vector embeddings for listings |
| **Trigger** | Called by `outbox-processor` on `listing_created`/`listing_updated` |
| **Input** | `{ listing_id, tenant_id, title, description }` |
| **Output** | Upserts row in `ai.embeddings` |
| **Authorization** | Service role only |
| **Rate Limit** | 3,000 embeddings/min (OpenAI limit) |
| **Retry** | 3x with 1s, 5s, 25s delays |
| **Timeout** | 10 seconds |
| **Metrics** | `ai.embed.duration_ms`, `ai.embed.token_count`, `ai.embed.cache_hit` |

**Logic**:
```
1. Compute MD5 hash of (title + description)
2. Check ai.embeddings WHERE entity_id = listing_id AND content_hash = hash
   → If exists and hash matches: SKIP (no re-embed needed)
3. Call OpenAI text-embedding-3-small
4. UPSERT into ai.embeddings
5. Log to ai.inference_logs
```

---

### 6.4 `ai-inference`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Authenticated LLM proxy with quota enforcement, PII redaction, semantic caching, and streaming |
| **Trigger** | HTTP POST from client |
| **Input** | `{ model, messages[], stream, max_tokens, context_type }` |
| **Output** | Streaming SSE response OR JSON completion |
| **Authorization** | Bearer JWT (authenticated) |
| **Rate Limit** | 60 req/min per user; 1,000 req/min per tenant |
| **Timeout** | 30 seconds (streaming: 120 seconds) |
| **Retry** | None (streaming responses cannot be retried mid-stream) |

**Pipeline**:
```
1. Validate JWT → extract tenant_id
2. Quota check (Redis): tenant AI tokens remaining?
   → If 0: return 402 Payment Required
3. Semantic cache lookup: embed user query, search ai.semantic_cache (cosine > 0.97)
   → If hit: return cached response immediately (P99 < 20ms)
4. PII Redaction: scrub email, phone, SSN patterns from user message
5. Prompt Injection Check: run classifier on user message
   → If score > 0.7: reject with 400
6. Call OpenAI API (streaming)
7. Post-flight: DLP scan output
8. Async: log to ai.inference_logs, decrement quota cache, insert to outbox
```

---

### 6.5 `stripe-webhook`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Ingest and process Stripe billing events |
| **Trigger** | HTTP POST from Stripe |
| **Input** | Raw Stripe webhook payload |
| **Output** | 200 OK (Stripe ACK) or 400/500 (Stripe retries) |
| **Authorization** | Stripe-Signature header validation |
| **Idempotency** | Check `monetization.processed_webhooks WHERE stripe_event_id = ?` |
| **Timeout** | 10 seconds |
| **Retry** | Stripe retries with backoff for up to 72 hours on non-2xx response |

**Event Handlers**:
| Stripe Event | Platform Action |
|:---|:---|
| `invoice.payment_succeeded` | INSERT ledger_event, UPDATE subscription status='active', emit `monetization.invoice_paid` |
| `invoice.payment_failed` | emit `monetization.invoice_failed`, trigger dunning notification |
| `customer.subscription.updated` | UPDATE platform.subscriptions, reset quotas, emit `monetization.subscription_changed` |
| `customer.subscription.deleted` | UPDATE subscription status='canceled', emit `tenant.suspended` after grace |

---

### 6.6 `search`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Unified hybrid search: keyword + semantic + geo + faceted |
| **Trigger** | HTTP GET from client |
| **Input** | `{ q, type, category, min_price, max_price, lat, lng, radius_km, sort, page, limit }` |
| **Output** | `{ results: [], total: int, facets: {}, suggestions: [], latency_ms: int }` |
| **Authorization** | Anonymous + Authenticated |
| **Rate Limit** | 100 req/min anonymous; 600 req/min authenticated |
| **Timeout** | 5 seconds |
| **Latency Target** | < 100ms P95 (cache miss); < 20ms P95 (cache hit) |

**Pipeline**:
```
1. Parse and validate query params
2. Check Redis search cache (key: hash of all params)
   → Hit: return cached results
3. Embed query string (with own Redis cache on query text)
4. Execute hybrid search RPC (SQL function):
   a. HNSW vector similarity on ai.embeddings (top 200 candidates)
   b. Intersect with relational filters (status, category, price, geo)
   c. Re-rank by: (0.6 * vector_score) + (0.2 * trust_score) + (0.2 * recency_score)
5. Fetch facet counts (category distribution, price histogram)
6. Store in Redis cache (2-min TTL)
7. Log to discovery.search_logs asynchronously
```

---

### 6.7 `recommend`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Generate personalized listing recommendations for a user's home feed |
| **Trigger** | HTTP GET from client |
| **Input** | `{ limit, offset, context }` + JWT |
| **Output** | `{ listings: [], algorithm_used: string }` |
| **Authorization** | Authenticated (falls back to trending for anonymous) |
| **Rate Limit** | 60 req/min per user |
| **Timeout** | 3 seconds |
| **Latency Target** | < 200ms P95 |

---

### 6.8 `telemetry-ingest`

| Attribute | Specification |
|:---|:---|
| **Purpose** | Batch-ingest client telemetry events. Validates, sanitizes, and bulk inserts. |
| **Trigger** | HTTP POST from client (batched every 5 seconds) |
| **Input** | `{ events: EventPayload[] }` (max 100 events per batch) |
| **Output** | `{ inserted: int, rejected: int }` |
| **Authorization** | Authenticated (anon events accepted but rate-limited by IP) |
| **Rate Limit** | 10 batches/min per user |
| **Timeout** | 5 seconds |

---

### 6.9 `moderation-scan`

| Attribute | Specification |
|:---|:---|
| **Purpose** | AI-powered content moderation for listings and messages |
| **Trigger** | Called by `outbox-processor` on `listing_created` / `message_sent` |
| **Input** | `{ entity_type, entity_id, tenant_id, text_content, image_urls[] }` |
| **Output** | Updates `trust.moderation_queue` |
| **Authorization** | Service role only |
| **Timeout** | 15 seconds |
| **Failure** | On failure, listing remains in `pending_review`. Alert to Super Admin after 3 scan failures. |

**Decision Logic**:
```
flagged = openai_moderation.results[0].flagged
confidence = openai_moderation.results[0].category_scores (max value)

If flagged AND confidence > 0.9:
  → INSERT moderation_queue (status=pending, severity=high, auto_action=quarantine)
  → UPDATE listings SET status='suspended'
Else if flagged AND confidence > 0.5:
  → INSERT moderation_queue (status=pending, severity=medium)
  → listing stays in pending_review for human review
Else:
  → UPDATE listings SET status='active', published_at=NOW()
  → Emit trust.content_approved
```

---

## SECTION 7 — BACKGROUND PROCESSING ARCHITECTURE

### 7.1 Job Classification

| Priority | Queue | Max Workers | Examples |
|:---|:---|:---|:---|
| P0 — Critical | `critical` | 10 | Payment processing, account suspension |
| P1 — High | `high` | 20 | Embedding generation, moderation scans |
| P2 — Normal | `normal` | 50 | Notification dispatch, analytics flush |
| P3 — Low | `low` | 10 | Cold storage archival, index rebuilds |

### 7.2 pg_cron Scheduled Jobs

```sql
-- Analytics daily rollup (runs 00:05 UTC every day)
SELECT cron.schedule('daily-analytics-rollup', '5 0 * * *',
  $$SELECT analytics.run_daily_rollup()$$);

-- Quota monthly reset (runs 00:00 on 1st of each month)
SELECT cron.schedule('monthly-quota-reset', '0 0 1 * *',
  $$UPDATE monetization.quota_usage SET listings_used=0, ai_calls_used=0, storage_used_mb=0
    WHERE reset_date < DATE_TRUNC('month', NOW())$$);

-- Stale embedding detection (runs Sunday 02:00 UTC)
SELECT cron.schedule('embedding-staleness-check', '0 2 * * 0',
  $$INSERT INTO outbox.events(tenant_id, event_type, aggregate_type, aggregate_id, payload)
    SELECT e.tenant_id, 'ai.embedding_stale', 'listing', e.entity_id, '{}'::jsonb
    FROM ai.embeddings e WHERE e.updated_at < NOW() - INTERVAL '30 days'$$);

-- Trust score decay (runs 03:00 UTC daily)
SELECT cron.schedule('trust-score-decay', '0 3 * * *',
  $$UPDATE intelligence.trust_scores
    SET score = GREATEST(0.1, score * 0.999)
    WHERE last_activity_at < NOW() - INTERVAL '30 days'$$);

-- Outbox cleanup (runs 04:00 UTC daily)
SELECT cron.schedule('outbox-cleanup', '0 4 * * *',
  $$DELETE FROM outbox.events
    WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '7 days'$$);

-- Partition creation (runs 00:30 UTC on 25th of each month)
SELECT cron.schedule('create-next-partition', '30 0 25 * *',
  $$SELECT analytics.create_next_month_partition()$$);

-- Cold storage archival (runs 05:00 UTC daily)
SELECT cron.schedule('cold-storage-archive', '0 5 * * *',
  $$SELECT analytics.archive_old_partitions()$$);

-- MV refresh for tenant KPIs (runs every hour)
SELECT cron.schedule('refresh-tenant-kpis', '0 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_tenant_kpis$$);
```

### 7.3 Dead Letter Queue (DLQ)

```sql
CREATE TABLE outbox.dead_letter (
  id              UUID        PK DEFAULT gen_random_uuid(),
  original_event_id UUID      NOT NULL,
  event_type      TEXT        NOT NULL,
  tenant_id       UUID        NOT NULL,
  payload         JSONB       NOT NULL,
  failure_reason  TEXT        NOT NULL,
  retry_count     SMALLINT    NOT NULL,
  last_error      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID
);
```

DLQ events trigger an alert to the Super Admin dashboard. SREs can replay individual events after investigating the root cause.

---

## SECTION 8 — EVENT DRIVEN ARCHITECTURE

### 8.1 Event Envelope Standard

```json
{
  "event_id": "UUIDv7",
  "event_type": "marketplace.listing_created",
  "schema_version": 1,
  "tenant_id": "uuid",
  "actor_id": "uuid",
  "actor_type": "USER | SERVICE | SYSTEM",
  "timestamp": "ISO-8601 UTC",
  "correlation_id": "trace-uuid",
  "causation_id": "parent-event-uuid | null",
  "payload": {},
  "metadata": {
    "producer_service": "listing-api",
    "environment": "PRODUCTION"
  }
}
```

### 8.2 Domain Event Catalog

| Event | Producer | Consumers | Payload Key Fields | Retention |
|:---|:---|:---|:---|:---|
| `marketplace.listing_created` | Listing API | AI (embed), Trust (scan), Analytics | `listing_id, title, description, seller_id` | 7 days |
| `marketplace.listing_updated` | Listing API | AI (re-embed if content changed) | `listing_id, changed_fields[], content_changed: bool` | 7 days |
| `marketplace.listing_published` | Trust Service | Discovery (index), Notification, Analytics | `listing_id, trust_score` | 7 days |
| `marketplace.listing_archived` | Listing API | Storage (move media), Analytics | `listing_id, reason` | 7 days |
| `discovery.search_executed` | Search Function | Analytics, Intelligence | `query, result_count, zero_result, latency_ms` | 30 days |
| `discovery.item_clicked` | Client (via telemetry) | Intelligence (update user embed), Analytics | `listing_id, position, feed_id` | 90 days |
| `identity.user_registered` | Auth Webhook | Notification (welcome), Analytics | `user_id, tenant_id, method` | 90 days |
| `identity.account_suspended` | Admin API | Notification, Audit | `user_id, reason` | Indefinite |
| `ai.inference_completed` | AI Edge Function | Monetization (billing), Analytics | `model, input_tokens, output_tokens, cost_usd, latency_ms` | 90 days |
| `ai.embedding_generated` | AI Embed Function | Discovery (invalidate cache) | `entity_id, entity_type, model_version` | 30 days |
| `monetization.invoice_paid` | Stripe Webhook | Company (reactivate), Notification | `invoice_id, amount_usd, plan_tier` | Indefinite |
| `monetization.quota_exceeded` | Quota Service | AI Gateway (block), Notification | `resource, current_usage, limit` | 30 days |
| `trust.content_quarantined` | Moderation Scan | Listing (suspend), Notification, Audit | `listing_id, reason, confidence_score` | 1 year |
| `trust.content_approved` | Moderation Scan | Listing (publish), Analytics | `listing_id, moderation_duration_ms` | 90 days |
| `trust.fraud_detected` | Trust Scorer | Admin Alert, Audit, Notification | `actor_id, risk_score, signals[]` | 1 year |
| `governance.admin_action_taken` | Super Admin API | Audit | `action_type, target_id, actor_id` | 7 years |

---

## SECTION 9 — SEARCH ENGINEERING

### 9.1 Hybrid Search Architecture

The search system combines three search modalities executed in parallel and merged:

```
USER QUERY: "cozy 2-bedroom apartment downtown under $2000"
    │
    ├─[1] KEYWORD SEARCH (pg_trgm + FTS)
    │      tsvector match on title + description
    │      GIN index: idx_listings_fts
    │      Returns: 500 candidates with text relevance score
    │
    ├─[2] SEMANTIC SEARCH (pgvector HNSW)
    │      Embed query → cosine similarity against ai.embeddings
    │      HNSW ef_search=40
    │      Returns: 200 candidates with vector distance score
    │
    └─[3] RELATIONAL FILTER (SQL)
           WHERE price <= 2000 AND status = 'active'
           AND tenant_id = jwt_tenant_id()
           Reduces candidates set

MERGE & RANK:
  Reciprocal Rank Fusion (RRF) to combine keyword + vector scores
  Apply trust_score boost: + (trust_score * 0.2)
  Apply recency boost: + (1 / (1 + days_since_published))
  Apply sponsored boost: + 0.5 if is_sponsored (with budget remaining)
  
DIVERSITY:
  Ensure max 3 listings from the same seller in top 20
  Ensure at least 2 listing_types represented if query is ambiguous
```

### 9.2 Autocomplete / Suggestions

```sql
-- Materialized view of popular query stems (refreshed nightly)
CREATE MATERIALIZED VIEW discovery.mv_popular_queries AS
SELECT
  tenant_id,
  query_normalized AS suggestion,
  COUNT(*) AS frequency,
  AVG(result_count) AS avg_results
FROM discovery.search_logs
WHERE created_at > NOW() - INTERVAL '30 days'
  AND zero_result = false
  AND LENGTH(query_normalized) > 2
GROUP BY tenant_id, query_normalized
HAVING COUNT(*) > 5
ORDER BY frequency DESC;

CREATE INDEX ON discovery.mv_popular_queries
  USING GIN (suggestion gin_trgm_ops);  -- Prefix matching
```

### 9.3 Geo Search

```sql
-- Listings within radius (meters) using PostGIS or Euclidean approximation
CREATE OR REPLACE FUNCTION search_listings_geo(
  center_lat DECIMAL, center_lng DECIMAL,
  radius_km FLOAT,
  query_embedding vector(1536) DEFAULT NULL
)
RETURNS TABLE(listing_id UUID, distance_km FLOAT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    -- Haversine approximation (fast, slightly less accurate than PostGIS)
    (6371 * acos(
      cos(radians(center_lat)) * cos(radians(l.location_lat)) *
      cos(radians(l.location_lng) - radians(center_lng)) +
      sin(radians(center_lat)) * sin(radians(l.location_lat))
    )) AS distance_km,
    CASE WHEN query_embedding IS NOT NULL
      THEN 1 - (e.embedding <=> query_embedding)
      ELSE 0.5
    END AS similarity
  FROM marketplace.listings l
  LEFT JOIN ai.embeddings e ON e.entity_id = l.id AND e.entity_type = 'listing'
  WHERE l.tenant_id = auth.jwt_tenant_id()
    AND l.status = 'active'
    AND l.deleted_at IS NULL
    AND l.location_lat IS NOT NULL
    AND l.location_lat BETWEEN (center_lat - radius_km/111.0)
                           AND (center_lat + radius_km/111.0)
    AND l.location_lng BETWEEN (center_lng - radius_km/(111.0 * cos(radians(center_lat))))
                           AND (center_lng + radius_km/(111.0 * cos(radians(center_lat))))
  ORDER BY distance_km ASC
  LIMIT 100;
END;
$$;
```

### 9.4 Search Analytics

All searches logged to `discovery.search_logs`. Key analytics derived:
- **Zero-result rate**: `COUNT(*) WHERE zero_result=true / COUNT(*)` — target < 5%
- **Click-through rate**: `COUNT(*) WHERE clicked_result_id IS NOT NULL / COUNT(*)` — target > 40%
- **Top unanswered queries**: `WHERE zero_result=true GROUP BY query_normalized` — drives category expansion
- **Search latency distribution**: Histogram from `latency_ms` column

---

## SECTION 10 — RECOMMENDATION ENGINEERING

### 10.1 Recommendation Pipeline

```
INPUTS:
  user_id  ──► User embedding (intelligence.user_embeddings)
  session  ──► Real-time session context (last 3 clicks)
  tenant   ──► Available active listings with embeddings

STAGE 1 — Candidate Generation (200ms budget):
  a. User-to-listing cosine similarity (HNSW, top 500)
  b. Collaborative filtering signals (users who liked X also liked Y)
  c. Category affinity from search history (top 3 categories)
  d. Merge + deduplicate → 200 candidates

STAGE 2 — Filtering (10ms budget):
  - Remove already-seen listings (last 30 days from analytics.raw_events)
  - Remove already-saved listings (from marketplace.favorites)
  - Remove listings from suspended sellers
  - Remove listings outside user's price range (if known)

STAGE 3 — Ranking (50ms budget):
  Score = (0.5 * vector_similarity)
         + (0.2 * seller_trust_score)
         + (0.15 * listing_quality_score)
         + (0.1 * recency_score)
         + (0.05 * popularity_score)  -- view/save velocity

STAGE 4 — Diversity Injection (10ms budget):
  Thompson Sampling: 80% exploitation (top ranked) + 20% exploration (random from tail)
  Ensure category diversity: max 3 from same category in top 10

STAGE 5 — Caching:
  Store ranked listing IDs in Redis: key=`feed:{tenant_id}:{user_id}`, TTL=5min
```

### 10.2 User Embedding Refresh

```
Trigger: User interaction (click, save, search) — debounced 5 minutes

Algorithm:
  old_embedding = intelligence.user_embeddings WHERE user_id = ?
  interaction_embeddings = [ai.embeddings WHERE entity_id IN (recent_interactions)]
  new_embedding = 0.8 * old_embedding + 0.2 * MEAN(interaction_embeddings)
  UPSERT intelligence.user_embeddings

Cold-start (new users):
  Use category preferences from onboarding questionnaire
  Fall back to trending listings in their region
```

---

## SECTION 11 — AI DATA ENGINEERING

### 11.1 Embedding Generation Standards

| Entity Type | Source Text | Model | Dimensions | Trigger |
|:---|:---|:---|:---|:---|
| `listing` | `title + " " + description + " " + tags[]` | text-embedding-3-small | 1536 | listing_created, listing_updated (content changed) |
| `user_preference` | Derived from last 20 interaction titles | text-embedding-3-small | 1536 | Interaction event, 5-min debounce |
| `search_query` | Raw user query | text-embedding-3-small | 1536 | On search (Redis-cached by query hash) |
| `category` | `name + " " + description` | text-embedding-3-small | 1536 | Category created/updated |

### 11.2 Semantic Cache Architecture

```sql
CREATE TABLE ai.semantic_cache (
  id              UUID          PK DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL FK platform.tenants(id),
  prompt_hash     TEXT          NOT NULL,     -- MD5 of exact prompt (L1 cache key)
  prompt_embedding vector(1536) NOT NULL,     -- For similarity lookup (L2 cache key)
  model           TEXT          NOT NULL,
  completion_text TEXT          NOT NULL,
  hit_count       INTEGER       DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  expires_at      TIMESTAMPTZ   NOT NULL,     -- DEFAULT NOW() + INTERVAL '24 hours'
  last_hit_at     TIMESTAMPTZ
);

-- L1: Exact match index
CREATE UNIQUE INDEX idx_cache_hash ON ai.semantic_cache(tenant_id, model, prompt_hash);

-- L2: Similarity index
CREATE INDEX idx_cache_hnsw ON ai.semantic_cache
  USING hnsw (prompt_embedding vector_cosine_ops) WITH (m=8, ef_construction=32);
```

**Cache Lookup Logic**:
1. Try L1 (exact `prompt_hash` match) → sub-millisecond
2. If miss, try L2 (cosine similarity > 0.97 on `prompt_embedding`) → < 20ms
3. If miss, call LLM, store in cache asynchronously

### 11.3 AI Monitoring

```
Metrics tracked in ai.inference_logs and exported to monitoring:
  - ai.token_usage.input      (counter, by tenant+model)
  - ai.token_usage.output     (counter, by tenant+model)
  - ai.cost.usd               (counter, by tenant+model)
  - ai.latency_ms             (histogram, by model+task_type)
  - ai.cache_hit_rate         (gauge, by tenant)
  - ai.fallback_rate          (gauge, by model)
  - ai.error_rate             (gauge, by model)

Alerts:
  - ai.cost.usd > $50/hour per tenant → Warning
  - ai.error_rate > 5% for any model → Critical
  - ai.latency_ms P95 > 5000ms → Warning
```

---

## SECTION 12 — NOTIFICATION ENGINEERING

### 12.1 Notification Architecture

```
EVENT ──► outbox-processor ──► notification-dispatcher Edge Function
              │
              ├─[1] In-App (Supabase Realtime)
              │      Broadcast to: notifications:{tenant_id}:{user_id}
              │      INSERT communication.notifications
              │      WebSocket push → client bell icon updates
              │
              ├─[2] Email (Resend)
              │      Template rendered server-side (React Email)
              │      Retry 3x with 5s, 30s, 300s delays
              │
              └─[3] SMS (Twilio) [Optional, high-priority events only]
                     Character limit: 160 chars
                     Cost-controlled: only for payment failures, security alerts
```

### 12.2 Notification Preference Matrix

```sql
CREATE TABLE communication.notification_preferences (
  user_id         UUID    PK FK identity.user_profiles(id),
  tenant_id       UUID    NOT NULL,
  email_enabled   BOOLEAN DEFAULT true,
  sms_enabled     BOOLEAN DEFAULT false,
  push_enabled    BOOLEAN DEFAULT true,
  -- Per-category opt-outs
  billing_email   BOOLEAN DEFAULT true,   -- Cannot be disabled
  marketing_email BOOLEAN DEFAULT true,
  listings_email  BOOLEAN DEFAULT true,
  messages_email  BOOLEAN DEFAULT true,
  trust_email     BOOLEAN DEFAULT true,   -- Cannot be disabled
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 12.3 Notification Templates

| Notification Type | Channels | Template Key | Trigger Event |
|:---|:---|:---|:---|
| Welcome | Email | `welcome` | `identity.user_registered` |
| Listing Published | Email + In-App | `listing_published` | `trust.content_approved` |
| Listing Rejected | Email + In-App | `listing_rejected` | `trust.content_quarantined` |
| New Message | Email + In-App | `new_message` | `communication.message_sent` |
| Payment Succeeded | Email | `payment_success` | `monetization.invoice_paid` |
| Payment Failed | Email + SMS | `payment_failed` | `monetization.invoice_failed` |
| Quota Warning (80%) | Email + In-App | `quota_warning` | `monetization.quota_warned` |
| Quota Exceeded | Email + In-App | `quota_exceeded` | `monetization.quota_exceeded` |
| Account Suspended | Email | `account_suspended` | `identity.account_suspended` |

### 12.4 Delivery Tracking

```sql
CREATE TABLE communication.notification_deliveries (
  id              UUID          PK DEFAULT gen_random_uuid(),
  notification_id UUID          FK communication.notifications(id),
  channel         TEXT          NOT NULL  -- in_app | email | sms
  status          TEXT          DEFAULT 'pending'  -- pending|sent|delivered|failed|bounced
  provider_id     TEXT          -- Resend/Twilio delivery ID
  attempted_at    TIMESTAMPTZ   DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  error_message   TEXT,
  retry_count     SMALLINT      DEFAULT 0
);
```

---

## SECTION 13 — FILE STORAGE ENGINEERING

### 13.1 Bucket Architecture

| Bucket | Visibility | Purpose | Max File Size | Allowed Types |
|:---|:---|:---|:---|:---|
| `listing-media` | Public | Listing images and videos | 50MB | image/*, video/mp4 |
| `avatars` | Public | User and company profile photos | 5MB | image/jpeg, image/png, image/webp |
| `tenant-assets` | Public | Logos, brand assets, CSS | 10MB | image/*, text/css |
| `digital-goods` | Private | Purchased downloadable files | 500MB | Any |
| `documents` | Private | Identity docs, contracts | 20MB | application/pdf, image/* |
| `moderation-evidence` | Private | Reports, screenshots | 20MB | image/*, application/pdf |
| `ai-artifacts` | Private | Exports, training data | 200MB | application/json, text/csv |

### 13.2 Upload Rules & Validation

```typescript
// Edge Function: validate-upload (called pre-signed URL generation)
const BUCKET_RULES = {
  'listing-media': {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    requireMagicBytes: true,  // Validate actual file content, not just MIME header
    virusScan: false,         // Handled by async post-upload scan
    imageProcessing: true,    // Generate WebP thumbnails after upload
  },
  'digital-goods': {
    maxSizeBytes: 500 * 1024 * 1024,
    allowedMimeTypes: ['*'],  // Any file type
    requireMagicBytes: false,
    virusScan: true,          // REQUIRED before delivery
    imageProcessing: false,
  }
};
```

### 13.3 Image Processing Pipeline

```
UPLOAD ──► Supabase Storage
           │
           └──► DB Webhook ──► image-processor Edge Function
                                │
                                ├─ Validate MIME type + magic bytes
                                ├─ Strip EXIF data (privacy)
                                ├─ Generate sizes:
                                │   original (kept as-is)
                                │   large    (1200px wide, WebP, Q80)
                                │   medium   (600px wide, WebP, Q80)
                                │   thumbnail(200px wide, WebP, Q70)
                                ├─ Store all variants in same bucket path + suffix
                                └─ UPDATE listing_media SET processing_status='complete', cdn_url=?
```

### 13.4 Storage RLS Policies

```sql
-- listing-media: Public read, tenant-scoped write
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-media');

CREATE POLICY "tenant_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.jwt_tenant_id()::text
  );

-- digital-goods: Buyer must have purchase record
CREATE POLICY "buyer_download" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'digital-goods'
    AND EXISTS (
      SELECT 1 FROM monetization.ledger_events le
      WHERE le.user_id = auth.uid()
        AND le.resource_id::text = (storage.foldername(name))[3]
        AND le.event_type = 'purchase'
    )
  );
```

---

## SECTION 14 — ANALYTICS ENGINEERING

### 14.1 Event Taxonomy

**Platform Events** (all captured in `analytics.raw_events`):

| Event Type | Data Captured | Business Purpose |
|:---|:---|:---|
| `page_view` | page_url, referrer, session_id | Traffic analysis, bounce rates |
| `listing_view` | listing_id, position, source | Impressions, funnel start |
| `listing_click` | listing_id, cta_type | CTR measurement |
| `listing_save` | listing_id | Interest signal |
| `search_executed` | query, result_count, latency_ms | Search quality |
| `lead_submitted` | listing_id, form_fields (sanitized) | Conversion tracking |
| `message_sent` | conversation_id | Engagement |
| `ai_interaction` | model, duration_ms, tokens | AI usage |
| `upgrade_prompt_shown` | quota_resource, plan_suggested | Revenue funnel |
| `upgrade_completed` | from_plan, to_plan | Conversion |

### 14.2 Aggregation Architecture

```
RAW EVENTS (analytics.raw_events, partitioned)
    │
    │ [pg_cron: 00:05 daily]
    ▼
DAILY AGGREGATES (analytics.mv_listing_daily_stats)
    ├── views, clicks, saves per listing per day
    └── Stored with UNIQUE index for upsert-style refresh
    │
    │ [pg_cron: hourly]
    ▼
TENANT KPI SNAPSHOTS (analytics.mv_tenant_kpis)
    ├── Active listings count
    ├── Active sellers count
    └── Used for real-time dashboard widgets
    │
    │ [On-demand query via API]
    ▼
FUNNEL ANALYSIS (ad-hoc SQL on raw_events)
    └── Listing view → save → lead → message → purchase
```

### 14.3 Cohort & Retention Analysis

```sql
-- Weekly retention cohort for tenant admins
CREATE OR REPLACE FUNCTION analytics.get_retention_cohort(
  p_tenant_id UUID,
  p_start_date DATE,
  p_weeks INT DEFAULT 8
)
RETURNS TABLE(cohort_week DATE, week_number INT, retained_users BIGINT, cohort_size BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH cohort_users AS (
    SELECT user_id, DATE_TRUNC('week', MIN(created_at))::date AS cohort_week
    FROM analytics.raw_events
    WHERE tenant_id = p_tenant_id AND event_type = 'page_view'
    GROUP BY user_id
  ),
  activity AS (
    SELECT DISTINCT user_id, DATE_TRUNC('week', created_at)::date AS activity_week
    FROM analytics.raw_events
    WHERE tenant_id = p_tenant_id AND event_type = 'page_view'
  )
  SELECT
    c.cohort_week,
    (DATE_PART('week', a.activity_week) - DATE_PART('week', c.cohort_week))::INT AS week_number,
    COUNT(DISTINCT a.user_id) AS retained_users,
    COUNT(DISTINCT c.user_id) AS cohort_size
  FROM cohort_users c
  JOIN activity a ON c.user_id = a.user_id
  WHERE c.cohort_week >= p_start_date
  GROUP BY c.cohort_week, week_number
  ORDER BY c.cohort_week, week_number;
END;
$$;
```

---

## SECTION 15 — ADMIN ENGINEERING

### 15.1 Super Admin Capabilities

| Capability | API Route | RLS Override | Audit Required |
|:---|:---|:---|:---|
| View all tenants | `GET /api/admin/tenants` | `is_super_admin()` bypass | No |
| Suspend tenant | `POST /api/admin/tenants/:id/suspend` | service_role | Yes |
| Override subscription | `POST /api/admin/tenants/:id/subscription` | service_role | Yes |
| View all moderation queue | `GET /api/admin/moderation/queue` | `is_super_admin()` bypass | No |
| Resolve moderation case | `POST /api/admin/moderation/:id/resolve` | service_role | Yes |
| Impersonate user | `POST /api/admin/users/:id/impersonate` | Forbidden (by design) | N/A |
| View platform metrics | `GET /api/admin/platform/metrics` | `is_super_admin()` bypass | No |
| Manage feature flags | `PATCH /api/admin/feature-flags/:key` | service_role | Yes |

### 15.2 Moderation Flow

```
CONTENT REPORTED (by user or AI scanner)
    │
    ▼
trust.moderation_queue INSERT
    │
    ├─ severity=LOW: Queue for weekly batch review
    ├─ severity=MEDIUM: Queue for 4-hour SLA human review
    ├─ severity=HIGH: Auto-suspend listing + 1-hour SLA
    └─ severity=CRITICAL: Auto-ban + immediate Super Admin alert
    │
    ▼
Moderator reviews case in Super Admin Console
    │
    ├─ APPROVE: UPDATE listing status='active'
    │           Emit trust.content_approved
    │           Update trust score (+0.05)
    │
    └─ REJECT: UPDATE listing status='rejected'
               Emit trust.content_quarantined
               Send rejection notification to seller
               Update trust score (-0.2)
               If 3rd rejection: flag for account review
```

### 15.3 Audit Log Query Interface

```sql
-- Audit log search function (used by Super Admin UI)
CREATE OR REPLACE FUNCTION governance.search_audit_logs(
  p_tenant_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, occurred_at TIMESTAMPTZ, actor_id UUID, actor_type TEXT,
  tenant_id UUID, action_category TEXT, action_type TEXT,
  target_entity TEXT, target_id UUID, trace_id TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only callable by super_admin role
  IF NOT auth.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT id, occurred_at, actor_id, actor_type, tenant_id,
         action_category, action_type, target_entity, target_id, trace_id
  FROM governance.audit_logs
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND (p_actor_id IS NULL OR actor_id = p_actor_id)
    AND (p_action_type IS NULL OR action_type = p_action_type)
    AND occurred_at BETWEEN p_start_date AND p_end_date
  ORDER BY occurred_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

---

## SECTION 16 — API ENGINEERING

### 16.1 REST Standards

**Base URL**: `https://api.platform.io/v1`

**Request Standards**:
- All requests: `Content-Type: application/json`
- All authenticated requests: `Authorization: Bearer <jwt>`
- All state-mutating requests: `Idempotency-Key: <uuid>` (optional but recommended)
- `X-Request-ID: <uuid>` — set by client; echoed in response

**Response Envelope**:
```json
{
  "data": {},           // Response payload (null on errors)
  "error": null,        // Error object (null on success)
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO-8601",
    "version": "1.0.0"
  }
}
```

**Error Contract**:
```json
{
  "data": null,
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "The requested listing does not exist or is not accessible.",
    "status": 404,
    "details": {}
  }
}
```

### 16.2 Standard Error Codes

| HTTP Status | Error Code | Trigger |
|:---|:---|:---|
| 400 | `VALIDATION_ERROR` | Input fails Zod schema |
| 401 | `UNAUTHENTICATED` | Missing or invalid JWT |
| 402 | `QUOTA_EXCEEDED` | Plan resource limit reached |
| 403 | `UNAUTHORIZED` | JWT valid but role insufficient |
| 404 | `NOT_FOUND` | Resource not found (or RLS hidden) |
| 409 | `CONFLICT` | Optimistic lock mismatch |
| 422 | `UNPROCESSABLE` | Business rule violation |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 503 | `SERVICE_UNAVAILABLE` | Upstream dependency down |

### 16.3 Pagination Standard

All list endpoints use **cursor-based pagination** (not offset, to avoid phantom reads):

```json
{
  "data": {
    "items": [],
    "cursor": {
      "next": "base64_encoded_cursor",
      "prev": "base64_encoded_cursor",
      "has_more": true
    },
    "total_count": 1247
  }
}
```

Cursor encodes: `{ id: UUID, created_at: TIMESTAMPTZ }` for stable ordering.

### 16.4 Versioning Strategy

- URL versioning: `/api/v1/`, `/api/v2/`
- No breaking changes within a major version
- 6-month deprecation notice for major version deprecation
- `Sunset` response header on deprecated endpoints

---

## SECTION 17 — SECURITY ENGINEERING

### 17.1 Defense-in-Depth Stack

```
Layer 1: CDN/WAF (Cloudflare)
  - OWASP Core Rule Set 3.3
  - DDoS protection
  - Rate limiting: 300 req/min/IP general, 10 req/min/IP on /auth/*
  - Bot score filtering (score < 30 → CAPTCHA)
  - Geo-blocking (OFAC-sanctioned countries)

Layer 2: API Gateway (Vercel Edge + Next.js Middleware)
  - JWT signature verification (RS256 JWKS)
  - Tenant context validation
  - Rate limiting (per user_id, per API key)
  - CORS enforcement

Layer 3: Application (Next.js API Routes + Edge Functions)
  - Zod input validation (every endpoint)
  - CSRF tokens (for cookie-based auth flows)
  - SQL injection prevention (parameterized queries only)
  - Path traversal prevention (storage paths validated)

Layer 4: Database (PostgreSQL)
  - RLS on all tables
  - Encrypted at rest (AES-256)
  - TLS 1.3 in transit

Layer 5: AI Layer
  - PII redaction proxy
  - Prompt injection classifier
  - Output DLP scanner
  - Token quota enforcement

Layer 6: Audit
  - Immutable governance.audit_logs
  - Behavioral anomaly detection via trust.fraud_alerts
```

### 17.2 Rate Limiting Implementation

```typescript
// Redis sliding window rate limiter
async function checkRateLimit(
  key: string, limit: number, windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const [, count] = await redis.pipeline()
    .zremrangebyscore(key, 0, windowStart)      // Remove old entries
    .zadd(key, now, `${now}-${Math.random()}`)   // Add current request
    .zcard(key)                                   // Count requests in window
    .expire(key, windowSeconds)                   // Reset window TTL
    .exec();

  const allowed = (count as number) <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - (count as number)),
    resetAt: Math.ceil((now + windowSeconds * 1000) / 1000)
  };
}
```

### 17.3 Secrets Management

| Secret | Storage | Rotation | Access |
|:---|:---|:---|:---|
| `SUPABASE_SERVICE_KEY` | Supabase Vault + Vercel Env | 90 days | Edge Functions only |
| `OPENAI_API_KEY` | Supabase Vault | 90 days | AI Edge Functions only |
| `STRIPE_SECRET_KEY` | Supabase Vault + Vercel Env | 90 days | Stripe Edge Function only |
| `STRIPE_WEBHOOK_SECRET` | Supabase Vault | On endpoint change | Stripe Webhook Function only |
| `JWT_SECRET` | Supabase managed | Annual (auto-rotate) | GoTrue only |
| DB passwords | Supabase managed | 30 days (automated) | PgBouncer only |

**Law**: No secret may appear in `.env` files committed to git, Dockerfile ENV, or application logs.

---

## SECTION 18 — OBSERVABILITY ENGINEERING

### 18.1 Logging Standards

```
Format: Structured JSON — MANDATORY in production
Required Fields:
  timestamp   : ISO-8601 UTC
  level       : DEBUG | INFO | WARN | ERROR | CRITICAL
  service     : string (e.g., "listing-api", "ai-embed-function")
  trace_id    : string (OTel W3C traceparent)
  tenant_id   : UUID | null
  user_id     : UUID | null
  message     : string

Example:
{
  "timestamp": "2026-05-31T02:15:00.123Z",
  "level": "INFO",
  "service": "listing-api",
  "trace_id": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "message": "Listing created successfully",
  "listing_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "duration_ms": 145
}
```

### 18.2 Key Metrics (Prometheus/Datadog Format)

| Metric | Type | Labels | SLO/Alert |
|:---|:---|:---|:---|
| `http_request_duration_seconds` | Histogram | `method, route, status` | P95 < 0.5s |
| `db_query_duration_ms` | Histogram | `table, operation` | P95 < 100ms |
| `outbox_events_pending` | Gauge | - | > 1000 = Warning |
| `outbox_events_dlq` | Counter | `event_type` | Any > 0 = Critical |
| `ai_inference_duration_ms` | Histogram | `model, task_type` | P95 < 3000ms |
| `ai_cost_usd_total` | Counter | `tenant_id, model` | > $50/hr = Warning |
| `realtime_connections` | Gauge | `tenant_id` | > 10000 = Warning |
| `storage_usage_bytes` | Gauge | `tenant_id, bucket` | > 80% quota = Warning |

### 18.3 SLOs

| Service | SLI | SLO |
|:---|:---|:---|
| API Gateway | Request success rate | 99.9% over 30 days |
| API Gateway | P95 response time | < 500ms over 30 days |
| Database | Query success rate | 99.99% over 30 days |
| Realtime | Message delivery success | 99.5% over 30 days |
| AI Inference | Success rate (excl. quota) | 99.0% over 30 days |
| Storage | Upload/download success | 99.9% over 30 days |
| Embedding Pipeline | Events processed < 5min | 99.5% over 30 days |

---

## SECTION 19 — SCALABILITY ENGINEERING

### 19.1 Scaling Tiers

#### Tier 1: 100K Users (Single Node)
```
Infrastructure:
  Supabase Pro/Business plan
  PostgreSQL: 8-core, 32GB RAM, 500GB SSD
  PgBouncer: 200 connection pool
  Edge Functions: Shared Deno Deploy
  pgvector: 5M embeddings (fits in 40GB RAM with HNSW index)

Bottlenecks at this tier:
  - Database CPU on complex analytics queries
  
Mitigation:
  - Materialized views refresh nightly
  - Read replica for analytics queries
```

#### Tier 2: 1M Users (Read Scale-Out)
```
Infrastructure:
  PostgreSQL Primary: 16-core, 64GB RAM
  + 2x Read Replicas for analytics and discovery
  PgBouncer: 500 connections (split: 300 write, 100 read × 2)
  pgvector: 50M embeddings — monitor HNSW RAM usage

New Components:
  Redis Cluster (3-node) for quota, session, and feed caching
  Dedicated vector replica for embedding searches only

Routing:
  Next.js middleware inspects operation type:
    GET /api/feed, /api/search, /api/analytics/* → Read Replica
    POST/PATCH/DELETE → Primary
```

#### Tier 3: 10M Users (Functional Extraction)
```
Infrastructure:
  PostgreSQL Primary: 32-core, 256GB RAM
  + 4x Read Replicas
  pgvector extracted to dedicated instance (or Pinecone)
  ClickHouse cluster for analytics.raw_events (> 1TB/month)
  Kafka for high-volume event streaming (replaces outbox-polling model)

Architecture Changes:
  analytics.raw_events → Kafka → ClickHouse
  ai.embeddings → Pinecone (managed)
  Supabase handles: all OLTP (listings, users, billing, comms)
  ClickHouse handles: all OLAP (funnels, cohorts, revenue reports)

Two-pass search:
  1. Pinecone: top-500 IDs by vector similarity
  2. Postgres: SELECT * FROM listings WHERE id IN (...) AND filters
```

---

## SECTION 20 — BACKEND IMPLEMENTATION ROADMAP

### Phase 1 — Foundation (Weeks 1–2)

**Deliverables**:
- [ ] SQL Migrations 001–008 (all domain schemas)
- [ ] RLS policy suite (all tables, full coverage)
- [ ] Auth helper functions (`jwt_tenant_id`, `jwt_role`, `is_super_admin`)
- [ ] `auth-context` Edge Function
- [ ] PgBouncer configuration
- [ ] pg_cron extension enabled + base scheduled jobs
- [ ] `outbox.events` table + `outbox-processor` Edge Function skeleton

**Dependencies**: None (greenfield)

**Risks**: RLS policy errors silently hide data → add CI test suite immediately

**Acceptance Criteria**:
1. Cross-tenant isolation test suite: 100% pass
2. All migrations idempotent via `supabase db push`
3. Auth flow E2E: login → context inject → JWT verified by RLS
4. `outbox-processor` can route one test event end-to-end

---

### Phase 2 — Core Marketplace (Weeks 3–5)

**Deliverables**:
- [ ] `marketplace.*` CRUD APIs (listings, categories, media)
- [ ] `ai-embed` Edge Function + content hash staleness check
- [ ] `moderation-scan` Edge Function
- [ ] `stripe-webhook` Edge Function + billing APIs
- [ ] Quota Service (Redis cache + enforcement middleware)
- [ ] Listing status state machine (draft → review → active)
- [ ] Storage buckets created + RLS policies applied
- [ ] Image processing pipeline

**Dependencies**: Phase 1

**Risks**:
- OpenAI API rate limits during bulk embed → implement token bucket
- Stripe webhook signature validation edge cases → use official SDK

**Acceptance Criteria**:
1. Full listing lifecycle (create → embed → moderate → publish → archive) in < 5 seconds
2. Quota enforcement blocks listing create at hard limit
3. Stripe `invoice.payment_succeeded` updates tenant plan within 30 seconds of Stripe event

---

### Phase 3 — Search (Weeks 6–7)

**Deliverables**:
- [ ] `search` Edge Function (hybrid keyword + vector + geo)
- [ ] HNSW index creation on `ai.embeddings`
- [ ] Autocomplete MV + suggestion API
- [ ] Search cache (Redis, 2-min TTL)
- [ ] Search analytics logging
- [ ] Zero-result detection + alert

**Dependencies**: Phase 2 (embeddings must exist)

**Acceptance Criteria**:
1. P95 search latency < 100ms (with warm cache)
2. Semantic search returns relevant results for natural language queries
3. Geo search within 10km radius returns correct results

---

### Phase 4 — Recommendations (Weeks 8–9)

**Deliverables**:
- [ ] `recommend` Edge Function (5-stage pipeline)
- [ ] User embedding generation + refresh logic
- [ ] `intelligence.user_embeddings` table + update triggers
- [ ] Feed cache (Redis, 5-min TTL)
- [ ] Cold-start fallback (trending listings)
- [ ] Diversity injection (exploration vs exploitation)

**Dependencies**: Phase 3 (listing embeddings complete)

**Acceptance Criteria**:
1. Personalized feed differs from trending feed for active users
2. Feed cache hit rate > 70% during peak hours
3. P95 recommendation latency < 200ms

---

### Phase 5 — Analytics (Weeks 10–11)

**Deliverables**:
- [ ] `telemetry-ingest` Edge Function
- [ ] `analytics.raw_events` partitioned table + pg_cron partition creation
- [ ] Daily analytics rollup MV + pg_cron job
- [ ] Tenant KPI MV (hourly refresh)
- [ ] Analytics APIs (overview, listing stats, revenue)
- [ ] Retention cohort function
- [ ] Cold storage archival job

**Acceptance Criteria**:
1. Telemetry ingest handles 10,000 events/minute without dropping
2. Dashboard KPIs load in < 500ms (served from MV)
3. Daily rollup completes in < 5 minutes for largest tenant

---

### Phase 6 — Administration (Weeks 12–13)

**Deliverables**:
- [ ] Super Admin API suite (all 8 endpoints)
- [ ] Moderation queue + resolution workflow
- [ ] Trust scoring pipeline
- [ ] Audit log service + search function
- [ ] Feature flag management
- [ ] Support ticket APIs

**Acceptance Criteria**:
1. Super Admin can suspend any tenant and it takes effect within 30 seconds
2. Audit log captures every admin action with full before/after state
3. Moderation queue SLA alert fires when case > 4 hours unresolved

---

### Phase 7 — Scale (Weeks 14–16)

**Deliverables**:
- [ ] Read replica routing in PgBouncer/connection layer
- [ ] Redis Cluster migration (from single node)
- [ ] ClickHouse integration (analytics offloading)
- [ ] Load testing: 10,000 concurrent users
- [ ] pgvector memory profiling + RAM planning
- [ ] Database partition archival to S3 automation
- [ ] Canary deployment pipeline

**Acceptance Criteria**:
1. P95 API latency maintained < 500ms at 10,000 concurrent users
2. Database CPU < 70% at peak load
3. Zero data loss during read-replica failover test
