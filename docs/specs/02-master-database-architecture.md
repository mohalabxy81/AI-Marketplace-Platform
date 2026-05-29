# SPEC 02 — MASTER DATABASE ARCHITECTURE

> **Basis**: [PLANNER.md §2-3, §13](file:///home/mohal665544/pr1/PLANNER.md) — Domain Ownership & Tenant Isolation  
> **Status**: Execution-Ready

---

## 1. Logical Database Architecture

### 1.1 Schema Ownership Model

The platform uses a **single PostgreSQL cluster** with strict schema-level domain isolation. Each domain owns exactly one schema. Cross-schema queries are forbidden at the application level and enforced via database role permissions.

| Schema Name | Owner Domain | Access Level | RLS Required |
|:------------|:------------|:-------------|:-------------|
| `auth` | Identity | Read/Write: Identity only | No (system-scoped) |
| `tenant_config` | Tenant | Read/Write: Tenant only | No (system-scoped) |
| `marketplace` | Marketplace Core | Read/Write: Marketplace only | Yes |
| `search_index` | Discovery | Read/Write: Discovery only | Yes |
| `ai_cache` | AI Infrastructure | Read/Write: AI Infra only | Yes |
| `vector_store` | Embedding & Vector | Read/Write: Vector only | Yes |
| `billing_ledger` | Monetization | Read/Write: Monetization only | Yes |
| `trust_registry` | Trust & Safety | Read/Write: Trust only | Yes |
| `experimentation` | Experimentation | Read/Write: Experimentation only | Yes |
| `governance` | Governance | Read/Write: Governance only | No (super_admin only) |
| `event_outbox` | Shared (Event Mesh) | Write: Any domain; Read: Outbox Collector | No |

### 1.2 Database Role Hierarchy

```
platform_superadmin (SUPERUSER)
├── platform_service_identity (CONNECT, USAGE on auth)
├── platform_service_tenant (CONNECT, USAGE on tenant_config)
├── platform_service_marketplace (CONNECT, USAGE on marketplace)
├── platform_service_discovery (CONNECT, USAGE on search_index)
├── platform_service_ai (CONNECT, USAGE on ai_cache)
├── platform_service_vector (CONNECT, USAGE on vector_store)
├── platform_service_billing (CONNECT, USAGE on billing_ledger)
├── platform_service_trust (CONNECT, USAGE on trust_registry)
├── platform_service_experiment (CONNECT, USAGE on experimentation)
├── platform_service_governance (CONNECT, USAGE on governance, READ on ALL)
├── platform_service_outbox_collector (READ on event_outbox)
└── platform_anon (CONNECT, minimal SELECT on public endpoints)
```

---

## 2. Domain ERDs

### 2.1 Auth Schema (`auth`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `users` | Core user identity records | None | Indefinite |
| `sessions` | Active authentication sessions | None | 30-day auto-purge |
| `auth_providers` | OAuth/SSO provider configurations | None | Indefinite |
| `mfa_enrollments` | Multi-factor authentication registrations | None | Until user deletion |
| `api_keys` | Programmatic API access keys | None | Until revocation |
| `password_reset_tokens` | Temporary password reset tokens | None | 1-hour TTL auto-purge |
| `login_attempts` | Rate-limiting and brute-force detection | Range by `created_at` (monthly) | 90-day retention |

#### Relationships
```
users (1) ──────── (N) sessions
users (1) ──────── (N) auth_providers
users (1) ──────── (N) mfa_enrollments
users (1) ──────── (N) api_keys
users (1) ──────── (N) login_attempts
users (1) ──────── (N) password_reset_tokens
```

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `users` | `idx_users_email` | UNIQUE B-Tree | Email lookup |
| `users` | `idx_users_external_id` | UNIQUE B-Tree | OAuth external ID lookup |
| `sessions` | `idx_sessions_token_hash` | UNIQUE B-Tree | Token-based session lookup |
| `sessions` | `idx_sessions_user_expires` | B-Tree (user_id, expires_at) | Active session queries |
| `login_attempts` | `idx_login_attempts_ip_created` | B-Tree (ip_address, created_at) | Rate limiting queries |
| `api_keys` | `idx_api_keys_key_hash` | UNIQUE B-Tree | API key validation |

#### Audit Requirements
- All `users` table mutations logged to `governance.audit_logs`
- Session creation/revocation logged
- MFA enrollment changes logged
- API key creation/revocation logged

---

### 2.2 Tenant Config Schema (`tenant_config`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `organizations` | Top-level organizational entities | None | Indefinite |
| `tenants` | Tenant workspace instances | None | Indefinite (soft-delete) |
| `workspaces` | Sub-workspace partitions within a tenant | None | Indefinite |
| `tenant_plans` | Subscription plan assignments | None | Indefinite |
| `plan_definitions` | Available plan tiers and limits | None | Indefinite |
| `feature_flags` | Per-tenant feature flag overrides | None | Indefinite |
| `custom_domains` | Tenant custom domain mappings | None | Indefinite |
| `tenant_members` | User-to-tenant membership and role assignments | None | Until membership revocation |
| `invitations` | Pending workspace invitations | None | 7-day TTL auto-purge |

#### Relationships
```
organizations (1) ──── (N) tenants
tenants (1) ────────── (N) workspaces
tenants (1) ────────── (1) tenant_plans
tenant_plans (N) ───── (1) plan_definitions
tenants (1) ────────── (N) feature_flags
tenants (1) ────────── (N) custom_domains
tenants (1) ────────── (N) tenant_members
tenant_members (N) ─── (1) auth.users [cross-schema reference via user_id UUID]
tenants (1) ────────── (N) invitations
```

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `tenants` | `idx_tenants_org` | B-Tree | Organization-scoped queries |
| `tenants` | `idx_tenants_slug` | UNIQUE B-Tree | Slug-based routing |
| `tenants` | `idx_tenants_status` | B-Tree | Active/suspended filtering |
| `custom_domains` | `idx_custom_domains_domain` | UNIQUE B-Tree | Domain resolution |
| `tenant_members` | `idx_members_user_tenant` | UNIQUE B-Tree (user_id, tenant_id) | Membership lookup |
| `tenant_members` | `idx_members_tenant_role` | B-Tree (tenant_id, role) | Role-based queries |
| `feature_flags` | `idx_flags_tenant_key` | UNIQUE B-Tree (tenant_id, flag_key) | Flag resolution |

---

### 2.3 Marketplace Schema (`marketplace`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `listings` | Core marketplace listing records | Range by `created_at` (quarterly) | Indefinite (soft-delete) |
| `listing_versions` | Immutable version snapshots of listing content | Range by `created_at` (quarterly) | 2-year retention |
| `listing_statuses` | Status transition audit trail | Range by `changed_at` (monthly) | 1-year retention |
| `categories` | Hierarchical category taxonomy | None | Indefinite |
| `category_attributes` | Category-specific attribute definitions | None | Indefinite |
| `listing_attributes` | Listing-specific attribute values | None | Follows listing retention |
| `listing_media` | Media asset references (images, videos, files) | None | Follows listing retention |
| `agents` | AI agent product registrations | None | Indefinite (soft-delete) |
| `companies` | Company/organization profiles | None | Indefinite (soft-delete) |
| `projects` | Project groupings for listings | None | Indefinite (soft-delete) |
| `developers` | Developer profiles linked to agents/tools | None | Indefinite (soft-delete) |
| `reviews` | Listing/agent reviews and ratings | Range by `created_at` (quarterly) | Indefinite |
| `listing_tags` | Tag associations for listings | None | Follows listing retention |
| `property_types` | Property type classifications | None | Indefinite |

#### Relationships
```
listings (N) ──────── (1) tenants [via tenant_id]
listings (N) ──────── (1) categories
listings (1) ──────── (N) listing_versions
listings (1) ──────── (N) listing_statuses
listings (1) ──────── (N) listing_attributes
listings (1) ──────── (N) listing_media
listings (1) ──────── (N) listing_tags
listings (N) ──────── (1) companies
listings (N) ──────── (1) property_types
categories (self) ─── parent_id → categories.id [adjacency list]
categories (1) ────── (N) category_attributes
agents (N) ─────────── (1) developers
agents (N) ─────────── (1) companies
projects (N) ────────── (1) companies
reviews (N) ─────────── (1) listings
reviews (N) ─────────── (1) auth.users [via reviewer_user_id]
```

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `listings` | `idx_listings_tenant_status` | B-Tree (tenant_id, status) | Tenant-scoped active listings |
| `listings` | `idx_listings_category` | B-Tree (category_id) | Category browsing |
| `listings` | `idx_listings_company` | B-Tree (company_id) | Company portfolio |
| `listings` | `idx_listings_created` | B-Tree (created_at DESC) | Recent listings |
| `listings` | `idx_listings_price` | B-Tree (price) | Price filtering |
| `listings` | `idx_listings_search_trgm` | GIN (title gin_trgm_ops) | Trigram text search |
| `listing_versions` | `idx_versions_listing` | B-Tree (listing_id, version DESC) | Version history |
| `listing_statuses` | `idx_statuses_listing_changed` | B-Tree (listing_id, changed_at DESC) | Status audit trail |
| `categories` | `idx_categories_parent` | B-Tree (parent_id) | Category tree traversal |
| `agents` | `idx_agents_tenant_status` | B-Tree (tenant_id, status) | Active agent queries |
| `reviews` | `idx_reviews_listing_rating` | B-Tree (listing_id, rating DESC) | Review aggregation |

#### RLS Policy
All tables with `tenant_id` column enforce RLS:
- Policy: `USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)`
- Super Admin bypass: `USING (current_setting('app.current_user_role', true) = 'super_admin')`

---

### 2.4 Search Index Schema (`search_index`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `search_candidates` | Pre-computed candidate pool with metadata scores | None | Follows listing lifecycle |
| `search_signals` | Aggregated engagement signals per listing | None | 90-day rolling window |
| `ranking_features` | Pre-computed ranking feature vectors | None | Refreshed daily |
| `feed_logs` | Feed generation audit trail | Range by `created_at` (daily) | 30-day retention |
| `query_logs` | Search query logs for analytics | Range by `created_at` (daily) | 90-day retention |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `search_candidates` | `idx_candidates_tenant_status` | B-Tree (tenant_id, status) | Tenant-scoped candidate retrieval |
| `search_signals` | `idx_signals_listing_type` | B-Tree (listing_id, signal_type) | Signal aggregation |
| `ranking_features` | `idx_features_listing` | B-Tree (listing_id) | Feature lookup during ranking |
| `feed_logs` | `idx_feedlogs_user_created` | B-Tree (user_id, created_at DESC) | User feed history |

---

### 2.5 AI Cache Schema (`ai_cache`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `model_registry` | Available AI model definitions | None | Indefinite |
| `prompt_registry` | Managed prompt templates with versions | None | Indefinite |
| `inference_cache` | Cached LLM responses keyed by prompt embedding hash | Range by `created_at` (weekly) | 7-day TTL |
| `token_usage_log` | Per-request token consumption records | Range by `created_at` (daily) | 90-day retention, then archive |
| `ai_policies` | Tenant-scoped AI usage policies | None | Indefinite |
| `ai_experiments` | AI model A/B test configurations | None | Indefinite |
| `provider_health` | Real-time provider availability tracking | None | 24-hour rolling window |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `model_registry` | `idx_models_provider_status` | B-Tree (provider, status) | Active model lookup |
| `prompt_registry` | `idx_prompts_name_version` | UNIQUE B-Tree (name, version) | Prompt resolution |
| `inference_cache` | `idx_cache_embedding_hash` | B-Tree (embedding_hash) | Cache hit lookup |
| `token_usage_log` | `idx_usage_tenant_created` | B-Tree (tenant_id, created_at) | Tenant usage aggregation |
| `token_usage_log` | `idx_usage_model_created` | B-Tree (model_id, created_at) | Model usage analytics |

---

### 2.6 Vector Store Schema (`vector_store`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `embeddings` | Vector representations of listings/agents/users | None (consider partitioning by tenant at scale) | Follows entity lifecycle |
| `embedding_versions` | Version tracking for embedding model changes | None | Indefinite |
| `embedding_refresh_jobs` | Background job tracking for embedding regeneration | None | 30-day retention |
| `vector_indexes` | Index metadata and health tracking | None | Indefinite |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `embeddings` | `idx_embeddings_entity_type` | B-Tree (entity_type, entity_id) | Entity embedding lookup |
| `embeddings` | `idx_embeddings_tenant_vector` | HNSW (embedding vector(1536)) with tenant filter | Tenant-scoped similarity search |
| `embeddings` | `idx_embeddings_model_version` | B-Tree (model_version) | Version-based invalidation queries |

---

### 2.7 Billing Ledger Schema (`billing_ledger`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `subscriptions` | Active subscription records | None | Indefinite |
| `plan_definitions` | Billing plan tiers (mirrored from tenant_config for billing isolation) | None | Indefinite |
| `invoices` | Generated invoice records | Range by `billing_period_start` (monthly) | 7-year retention (financial compliance) |
| `invoice_line_items` | Itemized invoice details | Range by `created_at` (monthly) | 7-year retention |
| `ledger_entries` | Immutable write-only financial ledger | Range by `created_at` (monthly) | 7-year retention |
| `credit_balances` | Current credit/token balances per tenant | None | Indefinite |
| `usage_meters` | Real-time usage counters | None | Current billing period |
| `ad_campaigns` | Promoted listing campaign configurations | None | Indefinite (soft-delete) |
| `ad_bids` | CPC/CPM bid records | Range by `created_at` (daily) | 90-day retention |
| `ad_impressions` | Ad impression/click tracking | Range by `created_at` (daily) | 90-day retention |
| `payment_methods` | Encrypted payment method references (Stripe tokens) | None | Until deletion |
| `stripe_sync_log` | Stripe webhook event processing log | Range by `received_at` (weekly) | 30-day retention |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `subscriptions` | `idx_subs_tenant_status` | UNIQUE B-Tree (tenant_id, status) | Active subscription lookup |
| `invoices` | `idx_invoices_tenant_period` | B-Tree (tenant_id, billing_period_start) | Invoice history |
| `ledger_entries` | `idx_ledger_tenant_created` | B-Tree (tenant_id, created_at) | Ledger audit trail |
| `ledger_entries` | `idx_ledger_type_created` | B-Tree (entry_type, created_at) | Type-based analytics |
| `credit_balances` | `idx_credits_tenant` | UNIQUE B-Tree (tenant_id) | Balance lookup |
| `usage_meters` | `idx_meters_tenant_resource` | UNIQUE B-Tree (tenant_id, resource_type) | Meter lookup |
| `ad_campaigns` | `idx_campaigns_tenant_status` | B-Tree (tenant_id, status) | Active campaign queries |
| `ad_bids` | `idx_bids_keyword_bid` | B-Tree (keyword, bid_amount DESC) | Auction queries |

#### Audit Requirements
- Ledger entries are WRITE-ONLY. No UPDATE or DELETE operations permitted
- All adjustments/refunds create offsetting ledger lines
- Stripe webhook processing must be idempotent (deduplicate by `stripe_event_id`)

---

### 2.8 Trust Registry Schema (`trust_registry`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `trust_scores` | Computed trust/reputation scores per tenant/user | None | Indefinite (historical) |
| `trust_score_history` | Trust score change audit trail | Range by `calculated_at` (monthly) | 1-year retention |
| `moderation_queue` | Content awaiting human or AI review | None | Until resolution + 30 days |
| `fraud_signals` | Detected fraud indicators | Range by `detected_at` (monthly) | 1-year retention |
| `policy_rules` | Content policy rule definitions | None | Indefinite |
| `quarantined_items` | Currently quarantined content references | None | Until resolution |
| `escalation_records` | Escalation workflow audit trail | Range by `created_at` (monthly) | 1-year retention |
| `reviewer_assignments` | Human reviewer task assignments | None | 90-day retention |
| `moderation_decisions` | Final moderation decisions with reasoning | Range by `decided_at` (monthly) | 2-year retention |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `trust_scores` | `idx_trust_entity` | UNIQUE B-Tree (entity_type, entity_id) | Score lookup |
| `moderation_queue` | `idx_modqueue_status_priority` | B-Tree (status, priority DESC) | Queue processing order |
| `moderation_queue` | `idx_modqueue_tenant` | B-Tree (tenant_id) | Tenant-scoped queue |
| `fraud_signals` | `idx_fraud_tenant_type` | B-Tree (tenant_id, signal_type) | Signal aggregation |
| `quarantined_items` | `idx_quarantine_entity` | B-Tree (entity_type, entity_id) | Quarantine status check |

---

### 2.9 Event Outbox Schema (`event_outbox`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `outbox_events` | Transactional outbox for domain event staging | Range by `created_at` (daily) | 7-day retention after publishing |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `outbox_events` | `idx_outbox_status_created` | B-Tree (published, created_at) | Unpublished event polling |
| `outbox_events` | `idx_outbox_domain_type` | B-Tree (producer_domain, event_type) | Domain-scoped event queries |

---

### 2.10 Governance Schema (`governance`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `audit_logs` | Platform-wide audit trail | Range by `created_at` (monthly) | 3-year retention |
| `system_configs` | Global system configuration key-value store | None | Indefinite |
| `schema_migrations` | Schema migration tracking | None | Indefinite |
| `global_announcements` | Platform-wide announcements | None | 1-year retention |
| `admin_actions` | Super Admin action log | Range by `performed_at` (monthly) | 3-year retention |

#### Key Indexes
| Table | Index | Type | Purpose |
|:------|:------|:-----|:--------|
| `audit_logs` | `idx_audit_actor_created` | B-Tree (actor_id, created_at DESC) | Actor audit trail |
| `audit_logs` | `idx_audit_entity_created` | B-Tree (entity_type, entity_id, created_at DESC) | Entity audit trail |
| `audit_logs` | `idx_audit_action_created` | B-Tree (action, created_at DESC) | Action-based queries |
| `system_configs` | `idx_configs_key` | UNIQUE B-Tree (config_key) | Config lookup |
| `admin_actions` | `idx_admin_actor_performed` | B-Tree (admin_id, performed_at DESC) | Admin activity log |

---

### 2.11 Experimentation Schema (`experimentation`)

#### Tables

| Table | Purpose | Partitioning | Retention |
|:------|:--------|:-------------|:----------|
| `experiments` | Experiment definitions and lifecycle | None | Indefinite |
| `experiment_variants` | Variant configurations per experiment | None | Follows experiment lifecycle |
| `user_assignments` | User-to-variant assignment records | Range by `assigned_at` (monthly) | 6-month retention |
| `experiment_results` | Aggregated experiment outcome metrics | None | Indefinite |

---

## 3. Table Ownership Matrix

| Schema | Table Count | Estimated Row Growth (Year 1) | Primary Scaling Concern |
|:-------|:-----------|:------------------------------|:-----------------------|
| `auth` | 7 | 100K users, 1M sessions | Session purge frequency |
| `tenant_config` | 9 | 10K tenants, 50K members | Routing table cache invalidation |
| `marketplace` | 14 | 500K listings, 2M versions | Listing partition management |
| `search_index` | 5 | 500K candidates, 100M feed logs | Feed log rotation |
| `ai_cache` | 7 | 50M inference cache entries, 500M usage logs | Cache TTL management, usage log archival |
| `vector_store` | 4 | 2M embeddings | HNSW index rebuild time |
| `billing_ledger` | 12 | 10M ledger entries, 5M usage meter events | Ledger append throughput |
| `trust_registry` | 9 | 1M moderation decisions, 5M fraud signals | Queue processing throughput |
| `event_outbox` | 1 | 100M events/year (purged after publish) | Polling frequency vs DB load |
| `governance` | 5 | 50M audit logs | Audit log partition management |
| `experimentation` | 4 | 10M user assignments | Assignment lookup performance |

---

## 4. Data Lifecycle Rules

### 4.1 Retention Tiers

| Tier | Retention Period | Data Types | Storage Strategy |
|:-----|:----------------|:-----------|:----------------|
| **Tier 1: Permanent** | Indefinite | Core entities (users, tenants, listings, categories) | Primary PostgreSQL, regular backups |
| **Tier 2: Compliance** | 7 years | Financial records (ledger entries, invoices) | Primary PostgreSQL → Cold archive after 2 years |
| **Tier 3: Operational** | 90 days - 2 years | Audit logs, moderation decisions, version history | Primary PostgreSQL with partition drops |
| **Tier 4: Transient** | 7 - 30 days | Cache entries, outbox events, session data | Auto-purge via background workers |
| **Tier 5: Real-time** | 24 hours | Provider health metrics, rolling windows | In-memory with periodic flush |

### 4.2 Archival Strategy

| Trigger | Source | Destination | Frequency |
|:--------|:-------|:-----------|:----------|
| Ledger entries older than 2 years | `billing_ledger.ledger_entries` | S3 Glacier (Parquet format) | Monthly |
| Audit logs older than 1 year | `governance.audit_logs` | S3 Standard (JSON Lines) | Monthly |
| Token usage logs older than 90 days | `ai_cache.token_usage_log` | ClickHouse (for analytics) | Weekly |
| Listing versions older than 2 years | `marketplace.listing_versions` | S3 Standard (JSON) | Quarterly |
| Feed/query logs older than 30/90 days | `search_index.feed_logs/query_logs` | ClickHouse (for analytics) | Daily |

---

## 5. Physical Database Architecture

### 5.1 Connection Pooling

| Component | Pool Size | Strategy |
|:----------|:---------|:---------|
| API Gateway (primary) | 100 connections | PgBouncer in transaction mode |
| Background Workers | 20 connections | PgBouncer in session mode |
| Realtime (Supabase) | 50 connections (dedicated) | Isolated pool, separate from API |
| Outbox Collector | 5 connections | Dedicated, session mode |
| Analytics ETL | 10 connections | Read replica, session mode |

### 5.2 Replication Topology

```
Primary (Write) ──── Synchronous ──── Standby (Hot Failover)
      │
      ├──── Asynchronous ──── Read Replica 1 (API Reads)
      │
      └──── Asynchronous ──── Read Replica 2 (Analytics/ETL)
```

### 5.3 Partitioning Strategy

| Table | Partition Key | Partition Type | Partition Interval | Max Partitions |
|:------|:-------------|:---------------|:-------------------|:--------------|
| `listings` | `created_at` | Range | Quarterly | 20 (5 years) |
| `listing_versions` | `created_at` | Range | Quarterly | 8 (2 years) |
| `ledger_entries` | `created_at` | Range | Monthly | 84 (7 years) |
| `invoices` | `billing_period_start` | Range | Monthly | 84 (7 years) |
| `token_usage_log` | `created_at` | Range | Daily | 90 (rolling) |
| `audit_logs` | `created_at` | Range | Monthly | 36 (3 years) |
| `feed_logs` | `created_at` | Range | Daily | 30 (rolling) |
| `query_logs` | `created_at` | Range | Daily | 90 (rolling) |
| `outbox_events` | `created_at` | Range | Daily | 7 (rolling) |
| `login_attempts` | `created_at` | Range | Monthly | 3 (rolling) |

### 5.4 Required PostgreSQL Extensions

| Extension | Purpose | Schema |
|:----------|:--------|:-------|
| `pgvector` | Vector similarity search (cosine, L2, inner product) | `vector_store` |
| `pg_trgm` | Trigram text similarity for fuzzy search | `marketplace` |
| `uuid-ossp` | UUID generation for primary keys | All schemas |
| `pgcrypto` | Cryptographic functions for hashing | `auth` |
| `pg_stat_statements` | Query performance monitoring | System-wide |
| `btree_gin` | GIN index support for B-tree types | `marketplace`, `search_index` |

---

## 6. Tenant Isolation Rules

### 6.1 RLS Policy Template

Every table containing `tenant_id` must implement these policies:

**Standard Tenant Isolation Policy**:
- Name: `{table}_tenant_isolation`
- For: ALL operations
- Using: `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`

**Super Admin Bypass Policy**:
- Name: `{table}_admin_bypass`
- For: SELECT only
- Using: `current_setting('app.current_user_role', true) = 'super_admin'`

### 6.2 Tenant Context Injection Protocol

1. Edge Gateway extracts `tenant_id` from JWT claims
2. Edge Gateway injects `x-tenant-id` header into forwarded request
3. Application service sets PostgreSQL session variable before any query:
   - `SET LOCAL app.current_tenant_id = '{tenant_id}'`
   - `SET LOCAL app.current_user_role = '{role}'`
4. PgBouncer in transaction mode ensures session variables are scoped to the transaction

### 6.3 Cross-Tenant Query Prevention

| Rule | Enforcement |
|:-----|:-----------|
| No `WHERE tenant_id IN (...)` with multiple tenant IDs | Application-level validation + RLS |
| No joins across tenant boundaries | RLS policies on all joined tables |
| Super Admin reads require explicit role context | Separate admin connection pool |
| Vector searches must include tenant filter | Enforced in vector query builder |
| Cache keys must include tenant namespace | Redis key convention: `tenant:{tenant_id}:*` |

---

## 7. Future Database Evolution Strategy

### 7.1 Phase 1-4 (Monolith)
- Single PostgreSQL cluster with schema-level isolation
- PgBouncer for connection pooling
- pgvector for vector operations
- Redis for caching

### 7.2 Phase 5-6 (Selective Extraction)
- Extract `billing_ledger` to dedicated PostgreSQL instance with independent backup/recovery
- Extract `vector_store` to dedicated pgvector instance or Pinecone for high-volume vector operations
- ClickHouse cluster for analytics workloads

### 7.3 Phase 7-8 (Distributed)
- Kafka replaces PostgreSQL outbox polling
- Milvus/Pinecone replaces pgvector at scale
- Read replicas per domain for high-read workloads
- Connection pool per extracted service

### 7.4 Phase 9 (Global)
- Multi-region PostgreSQL replication (Aurora Global Database)
- Regional read replicas with local pgvector indexes
- Global Redis cluster with cross-region replication
- Edge-cached vector indexes for sub-50ms global latency
