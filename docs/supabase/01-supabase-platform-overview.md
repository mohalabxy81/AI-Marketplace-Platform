# 1. SUPABASE PLATFORM OVERVIEW

> **Status**: Approved
> **Target Audience**: Platform Architects, DevOps Engineers, Backend Leads
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Executive Summary

Supabase acts as the **Data, Intelligence, and Security Kernel** for the entire AI-Native Marketplace Operating System. In this architecture, Supabase is not merely treated as a hosted PostgreSQL database, but as the integrated control plane that manages identity, real-time state, vector memory, event orchestration, and row-level authorization.

By unifying the database, API layer (PostgREST), connection pooler (PgBouncer), authentication (GoTrue), real-time message bus (Elixir), and edge compute (Deno) into a single bounded context, the platform drastically reduces the network hops and operational complexity typically associated with microservice sprawl.

The frontend (Next.js) and the AI orchestration layers rely on Supabase as the absolute source of truth. If Supabase is operational, the core marketplace functions—discovery, matching, transaction, and communication—must remain operational, even if peripheral services degrade.

---

## 2. Architectural Role

Supabase occupies Layer 2 (Data & Integration) and Layer 3 (Intelligence & State) of the platform architecture.

### 2.1 The Unified Backend-as-a-Service (BaaS) Paradigm
Rather than building bespoke REST APIs in Node.js/Go for every CRUD operation, the platform leverages **PostgREST**. This allows Next.js React Server Components (RSCs) to query the database directly over HTTP.

- **Frontend Role**: Next.js handles routing, HTML rendering (SSR), and optimistic UI (Zustand/TanStack Query). It does *not* enforce data authorization.
- **Backend Role**: Supabase PostgREST receives the JWT from Next.js and delegates authorization entirely to PostgreSQL Row Level Security (RLS). 
- **Edge Role**: Supabase Edge Functions handle tasks that require asynchronous external API calls, such as Stripe webhooks or OpenAI inference.

### 2.2 Core Responsibilities

| Sub-System | Technology | Primary Platform Responsibility |
|:---|:---|:---|
| **Relational Store** | PostgreSQL 15+ | Transactional truth, foreign key integrity, schema isolation. |
| **Vector Store** | `pgvector` extension | Semantic memory, listing embeddings, high-dimensional similarity search. |
| **API Gateway** | PostgREST / Kong | Auto-generated REST and GraphQL endpoints reflecting the schema. |
| **Connection Pooling**| PgBouncer | Managing connection limits for serverless Next.js and Edge Function environments. |
| **Identity / Auth** | GoTrue | JWT issuance, OAuth providers, Magic Links, Multi-Factor Authentication (MFA). |
| **Realtime Bus** | Elixir Phoenix | WebSocket channels for presence, broadcasting, and Change Data Capture (CDC). |
| **Edge Compute** | Deno Edge Functions| Webhooks, background workers, AI orchestration, event routing. |
| **Object Storage** | S3-backed Storage | High-resolution assets, avatars, and private moderation evidence. |

---

## 3. Scalability Expectations

The architecture is designed to support the "Shopify/Airbnb" operational profile:

### 3.1 Tenancy Scale Targets
- **100 Tenants**: Vertically scaled single instance. All compute fits on a single node.
- **1,000 Tenants**: Upgraded compute (e.g., 16-core, 64GB RAM). Introduction of read-replicas for heavy analytic/discovery queries.
- **10,000 Tenants**: Vector workloads extracted to dedicated pgvector clusters. Introduction of ClickHouse for raw event telemetry offloading.
- **100,000 Tenants**: Regional sharding. EU tenants reside on EU-central clusters; US tenants on US-east clusters. Global routing managed via Vercel Edge.

### 3.2 Performance Baselines (SLOs)
- **Authentication**: < 150ms P95 latency.
- **Listing Retrieval (Indexed)**: < 50ms P95 latency.
- **Vector Semantic Search (HNSW)**: < 100ms P95 latency (cache miss); < 20ms P95 latency (Redis semantic cache hit).
- **Realtime Broadcast**: < 200ms glass-to-glass latency across global regions.
- **Database Connection Acquisition**: < 10ms via PgBouncer transaction pooling.

---

## 4. Multi-Tenant Responsibilities

Supabase is the ultimate enforcer of the multi-tenant architecture. The platform operates on a **Logical Separation** model (shared schema, shared tables) rather than Physical Separation (database-per-tenant).

### 4.1 Strict Isolation via RLS
Row-Level Security (RLS) is not optional; it is the constitutional law of the database. Every table containing tenant data must possess a `tenant_id` column. Supabase GoTrue Auth hooks inject the `tenant_id` into the user's JWT. RLS policies intercept every query and implicitly append `WHERE tenant_id = <jwt.tenant_id>`.

### 4.2 Cross-Tenant Boundaries
A user may belong to multiple tenants (e.g., an agency managing multiple seller accounts). However, the active session is strictly bound to a single `tenant_id` at any given time. Cross-tenant aggregation is permitted *only* for the Super Admin role operating within the `governance` and `analytics` schemas via explicit RLS bypasses.

---

## 5. AI Infrastructure Responsibilities

Supabase serves as the primary memory and routing layer for the AI-Native components.

### 5.1 Semantic Memory (pgvector)
All text entities (listing descriptions, user preferences, search queries) are converted into 1536-dimensional vectors (OpenAI text-embedding-3-small) and stored in Supabase. Supabase handles the HNSW (Hierarchical Navigable Small World) indexing to allow sub-millisecond similarity queries across millions of rows.

### 5.2 The AI Event Loop
Supabase Database Webhooks trigger Edge Functions when data changes. For example, when a seller updates a listing, Postgres fires a webhook to a Deno Edge Function, which calls the OpenAI Embedding API, generates the new vector, and updates the `pgvector` column. The cognitive load is handled statelessly at the edge, while the structural memory resides in Postgres.

### 5.3 Prompt and Model Governance
System prompts and LLM constraints are not hardcoded in the Next.js application. They are stored as versioned records within the Supabase `ai` schema. This allows platform operators to hot-swap prompts and models without redeploying code.

---

## 6. Realtime Responsibilities

Supabase Realtime replaces the need for custom Socket.io or Pusher servers.

### 6.1 Ephemeral State (Presence & Broadcast)
The Elixir-based real-time engine manages "who is online" (Presence) and ephemeral cursor/typing indicators (Broadcast). This is crucial for the CRM/Chat domain and collaborative workspace tools within the tenant dashboards.

### 6.2 Durable State (Postgres CDC)
Supabase hooks into the PostgreSQL Write-Ahead Log (WAL). When a transaction commits (e.g., a lead converts to a sale), the CDC engine pushes the update over WebSockets directly to the subscribed Next.js client, instantly updating the UI without polling.

---

## 7. Governance Responsibilities

Supabase provides the immutable foundation for Trust & Safety, Compliance, and Billing.

### 7.1 Immutable Audit Logging
All destructive actions (DELETE, UPDATE) on critical tables trigger Postgres functions that append records to the `audit` schema. This table is append-only. No role, not even the Super Admin, can modify or delete an audit log.

### 7.2 Financial Ledger Integrity
The `billing` schema acts as an event-sourced ledger. Billing events generated by Stripe webhooks (processed via Deno Edge Functions) are inserted into the ledger. RLS prevents any tenant from modifying their own billing state. Entitlements and quotas are calculated by aggregating these ledger entries directly within Postgres.
