# 2. DATABASE ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Database Administrators, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Schema Isolation Strategy

The platform employs a **Logical Separation** multi-tenant model. Rather than provisioning a separate database instance or physical schema per tenant (which limits global discovery and cross-tenant AI training), the platform uses a unified database partitioned by functional domains (PostgreSQL schemas).

Every table within these functional schemas implements Row-Level Security (RLS) to enforce strict tenant isolation at the query execution level.

### 1.1 The 15 Domain Schemas

The database is divided into 15 bounded contexts. Cross-schema querying is tightly controlled and discouraged outside of the `analytics` and `governance` boundaries.

| Schema Name | Primary Purpose | Key Tables | RLS Enforcement |
|:---|:---|:---|:---|
| `public` | The default schema. Deprecated for business logic. Used exclusively for shared global lookup tables and enums. | `countries`, `currencies` | Permissive (Read-Only) |
| `auth` | Supabase GoTrue schema. Immutable structure. | `users`, `identities`, `sessions` | Super Admin Only |
| `platform` | Master tenant directory and global platform config. | `tenants`, `workspaces`, `subscriptions` | Strict Tenant Isolation |
| `identity` | Extended user profiles, tenant memberships, and roles. | `user_profiles`, `tenant_members` | Strict Tenant Isolation |
| `marketplace` | Core marketplace listings, categories, and inventory. | `listings`, `categories`, `attributes` | Strict Tenant Isolation |
| `discovery` | Search history, feed generation, and user intent tracking. | `search_logs`, `feed_impressions` | Strict Tenant Isolation |
| `crm` | Buyer-seller interactions, leads, and saved items. | `leads`, `saved_listings` | Strict Tenant Isolation |
| `communication` | Messaging, chat, and email/SMS logs. | `conversations`, `messages` | Strict Tenant/User Isolation |
| `ai` | Prompts, embedding cache, LLM configurations, inference logs. | `semantic_cache`, `inference_logs` | Strict Tenant Isolation |
| `intelligence` | Pre-calculated trust scores, user embeddings, and models. | `user_embeddings`, `trust_scores` | Strict Tenant Isolation |
| `monetization` | Billing ledger, token usage, invoices, and ad auctions. | `ledger_events`, `invoices` | Strict Tenant Isolation |
| `trust` | Fraud detection rules, quarantine logs, moderation queue. | `fraud_alerts`, `moderation_queue` | Strict Tenant Isolation |
| `analytics` | Aggregated data marts and materialized views. | `daily_metrics`, `tenant_kpis` | Strict Tenant Isolation |
| `governance` | Immutable audit logs and compliance trails. | `audit_logs`, `data_exports` | Append-Only (Super Admin Read) |
| `outbox` | Event mesh staging area for the transactional outbox pattern. | `events`, `dead_letter` | Service Role Only |

---

## 2. Role and Permission Hierarchy

Supabase relies on PostgREST to automatically map database roles to HTTP endpoints. The platform defines a strict hierarchy of PostgreSQL roles.

### 2.1 The Role Graph

```text
postgres (Superuser)
  └── supabase_admin (Managed Service Role)
        ├── authenticator (PostgREST Gateway Role)
        │     ├── anon (Unauthenticated Users)
        │     └── authenticated (Authenticated Users via JWT)
        ├── service_role (Edge Functions / Admin bypass)
        └── platform_roles
              ├── platform_api_role (Standard CRUD operations)
              ├── platform_read_role (Analytics / Read-Replicas)
              └── platform_migrations_role (CI/CD DDL execution)
```

### 2.2 Execution Contexts

1. **The `authenticated` Role Flow**:
   - Client sends JWT to Supabase API.
   - PostgREST assumes the `authenticator` role.
   - PostgREST verifies the JWT signature.
   - PostgREST switches to the `authenticated` role.
   - PostgREST sets local session variables (`request.jwt.claims`).
   - Query is executed against the target schema. RLS intercepts and reads `request.jwt.claims->>'tenant_id'`.

2. **The `service_role` Flow**:
   - Edge Functions or backend workers authenticate using the Service Role Key.
   - The query executes as `service_role`, which possesses the `BYPASSRLS` attribute.
   - **Crucial Rule**: The Service Role must *never* be exposed to the frontend. It is reserved exclusively for system-level background processes (e.g., Stripe webhooks, outbox polling).

---

## 3. The Transactional Outbox Pattern

To maintain consistency without distributed transactions (Two-Phase Commit), the database uses the **Transactional Outbox Pattern** to communicate across schemas and external systems.

### 3.1 Mechanism
When a listing is created in the `marketplace` schema, the system needs to:
1. Embed the text (external OpenAI call).
2. Scan for fraud (external Moderation API).
3. Notify subscribers (WebSocket).

Doing this synchronously in the HTTP request is brittle. Instead:
1. The Postgres transaction inserts the listing into `marketplace.listings`.
2. Within the *same transaction*, it inserts an event record into `outbox.events` (e.g., `marketplace.listing_created`).
3. The transaction commits. Data is safely persisted.
4. An external worker (or Edge Function triggered by a Database Webhook) polls `outbox.events` or listens to the WAL, reads the event, and routes it to Kafka or processes it directly.
5. The worker updates the event status to `PROCESSED`.

### 3.2 Outbox Table Definition
```sql
CREATE TABLE outbox.events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,           -- e.g., 'marketplace.listing_created'
    aggregate_type TEXT NOT NULL,       -- e.g., 'listing'
    aggregate_id UUID NOT NULL,         -- e.g., 'uuid-of-listing'
    tenant_id UUID NOT NULL,            -- Mandatory for isolation
    payload JSONB NOT NULL,             -- The event data
    status TEXT DEFAULT 'PENDING',      -- 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
```

---

## 4. Foreign Key and Referential Integrity Rules

The platform relies on PostgreSQL's robust referential integrity, with specific rules for multi-tenant architectures.

1. **Tenant Cascades**: A deletion in `platform.tenants` MUST cascade downward to all domain schemas. If a tenant is hard-deleted, all their users, listings, billing ledgers, and vectors must be destroyed synchronously or asynchronously via scheduled jobs to comply with GDPR Right-to-Be-Forgotten.
2. **Soft Deletes by Default**: Direct DELETE statements are forbidden on core business entities (`listings`, `users`, `tenants`). Instead, an `is_deleted` BOOLEAN or `deleted_at` TIMESTAMPTZ column is used. RLS policies must automatically exclude soft-deleted rows.
3. **Cross-Schema Foreign Keys**: Permitted. For example, `marketplace.listings.tenant_id` safely references `platform.tenants.id`.
4. **Immutable Lookups**: References to `public.countries` or `public.categories` should use RESTRICT on delete to prevent breaking historical data.

---

## 5. Extensions Architecture

The database requires the following PostgreSQL extensions to be enabled:

| Extension | Purpose | Implementation Domain |
|:---|:---|:---|
| `pgcrypto` / `pg_stat_statements` | UUID generation, query profiling | Global |
| `pgvector` | HNSW indexes, 1536-dimensional semantic search | `ai`, `intelligence`, `marketplace` |
| `pg_trgm` | Fast text search (Trigram indexing) for fuzzy matching | `discovery`, `marketplace` |
| `pg_cron` | Scheduled database maintenance (partition pruning) | `governance`, Super Admin |
| `postgis` | (Optional/Future) Geolocation search for local marketplaces | `discovery` |

---

## 6. Partitioning Strategy

For tables projected to exceed 100 million rows, PostgreSQL declarative partitioning is implemented.

### 6.1 Time-Series Data (List Partitioning by Month)
- `governance.audit_logs`
- `discovery.search_logs`
- `monetization.ledger_events`

*Example:* `audit_logs_2026_05`, `audit_logs_2026_06`. Partitions older than 2 years are archived to cold storage (S3) and dropped from the active database.

### 6.2 High-Velocity Data (Hash Partitioning by Tenant ID)
- `marketplace.listings` (If the marketplace supports high-frequency catalog syncing via API).
- `intelligence.user_embeddings`

Partitioning by `tenant_id` ensures that all data for a specific tenant physically resides in the same partition, reducing disk I/O when retrieving tenant-specific feeds.
