# 2. SCHEMA STRATEGY

> **Status**: Approved
> **Target Audience**: Database Architects, Supabase Engineers
> **Domain**: Data Architecture

## 1. Schema Architecture Overview
To maintain the Hybrid Modular Monolith architecture, we utilize PostgreSQL schemas as hard namespace boundaries. This maps directly to Domain-Driven Design (DDD) bounded contexts. Tables belonging to different domains must cross-communicate via foreign keys carefully or utilize API layers/events if strictly decoupled.

## 2. Schema Definitions

### `auth` (Managed by Supabase)
- **Ownership**: Supabase GoTrue.
- **Responsibilities**: Core identity, password hashing, 2FA, session tracking.
- **Isolation**: Global. Internal users only.
- **Scaling Strategy**: Tuned natively by Supabase; read-replicas for high authentication load.

### `core` (or `public`)
- **Ownership**: Platform Infrastructure Team.
- **Responsibilities**: Shared utility tables, global enums, platform-wide configurations.
- **Isolation**: Global (no tenant isolation required).
- **Scaling Strategy**: Highly cached via Redis; rarely written.

### `tenant`
- **Ownership**: Identity & Access Management Team.
- **Responsibilities**: Organizations, workspaces, domain mapping, tenant feature flags.
- **Isolation**: Global table, but rows isolated via RLS to Tenant Owners.
- **Scaling Strategy**: Partitioned by region if necessary; predominantly read-heavy.

### `identity`
- **Ownership**: Identity & Access Management Team.
- **Responsibilities**: Extended user profiles, preferences, role-mapping to tenants (`tenant_members`).
- **Isolation**: Isolated by `user_id` and mapped `tenant_id`.
- **Scaling Strategy**: Standard B-Tree indexing on `user_id`.

### `marketplace`
- **Ownership**: Core Product Team.
- **Responsibilities**: Listings, categories, leads, reviews.
- **Isolation**: Strict `tenant_id` isolation via RLS.
- **Scaling Strategy**: Partition `listings` by `tenant_id` hash or creation date if volume exceeds 100M rows.

### `search` & `discovery`
- **Ownership**: Discovery & Search Team.
- **Responsibilities**: Search history, materialized views for fast retrieval, saved queries.
- **Isolation**: Isolated by `user_id` and `tenant_id`.
- **Scaling Strategy**: Extensive use of GiST/GIN indexes. Heavy queries routed to read-replicas.

### `recommendation` & `ai`
- **Ownership**: AI Platform Team.
- **Responsibilities**: Prompts, model registry, embeddings (`vector` type), inference logs.
- **Isolation**: Isolated by `tenant_id`. Prompts can be global or tenant-specific.
- **Scaling Strategy**: `ai_logs` partitioned by month. Vectors indexed using HNSW (Hierarchical Navigable Small World).

### `billing`
- **Ownership**: Finance & Monetization Team.
- **Responsibilities**: Subscriptions, usage quotas, stripe customer mapping, invoices.
- **Isolation**: Strict `tenant_id` isolation.
- **Scaling Strategy**: High consistency requirements. Use row-level locks (`FOR UPDATE`) during quota deductions.

### `trust` & `moderation`
- **Ownership**: Trust & Safety Team.
- **Responsibilities**: Trust scores, flagged content, moderation queues.
- **Isolation**: Admin-only access.
- **Scaling Strategy**: Archival of resolved cases to cold storage after 90 days.

### `analytics`
- **Ownership**: Data Engineering Team.
- **Responsibilities**: Event snapshots, aggregate views, metrics.
- **Isolation**: `tenant_id` isolated for tenant-facing dashboards.
- **Scaling Strategy**: Use PostgreSQL Materialized Views refreshed via pg_cron. High-velocity raw events should bypass Postgres and go straight to ClickHouse.

### `governance`
- **Ownership**: Security & Compliance Team.
- **Responsibilities**: Audit logs, compliance records.
- **Isolation**: Super Admin only. WORM (Write-Once-Read-Many) patterns.
- **Scaling Strategy**: Strictly partitioned by date. Old partitions dropped/archived to S3.

### `realtime`
- **Ownership**: Infrastructure Team.
- **Responsibilities**: Ephemeral state, presence tables, notification outboxes.
- **Isolation**: `tenant_id` and `user_id`.
- **Scaling Strategy**: Unlogged tables (if ephemeral) to reduce WAL overhead, or Redis integration.

### `experiments`
- **Ownership**: Growth & Product Team.
- **Responsibilities**: A/B test assignments, variants.
- **Isolation**: Global configuration; read by all.
- **Scaling Strategy**: Fully cached at the Edge/Redis.
