# 17. SUPABASE SCALING STRATEGY

> **Status**: Approved
> **Target Audience**: Platform Architects, DevOps Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. The Scaling Horizon

Scaling a multi-tenant PostgreSQL database requires anticipating bottlenecks before they occur. The platform scales through 4 distinct phases based on Tenant Count and Vector Load.

---

## 2. Phase 1: Vertical Scaling (1 to 1,000 Tenants)

PostgreSQL scales vertically extraordinarily well. Premature sharding introduces massive operational complexity.

### 2.1 Compute and Memory
- The primary instance runs on dedicated compute (e.g., AWS EC2 `r6g.4xlarge` / Supabase 16XL).
- **RAM is the primary bottleneck**: `pgvector` HNSW indexes must fit entirely in memory to achieve < 50ms latency. If vectors outgrow RAM, the OS will thrash the disk, and search latency will degrade to > 500ms.

### 2.2 Connection Management
Serverless frontend frameworks (Next.js) will easily open 10,000+ connections under load, crashing Postgres.
- **PgBouncer (Transaction Mode)** is mandatory. It sits between PostgREST and Postgres, maintaining a pool of ~200 actual database connections while queuing thousands of incoming HTTP requests.

---

## 3. Phase 2: Read-Scale Out (1,000 to 10,000 Tenants)

As discovery traffic (buyers browsing marketplaces) overtakes transactional traffic (sellers updating listings), the primary node becomes CPU bound.

### 3.1 Read Replicas
- Deploy 2+ Hot Standby Read Replicas.
- **Routing**: The Next.js API layer routes `GET` requests for `marketplace.listings` and `ai.embeddings` to the Read Replicas.
- **Consistency**: All mutations (`POST`, `PATCH`, `DELETE`) route to the Primary. Due to asynchronous replication delay (typically < 100ms), the frontend must utilize Optimistic UI updates (via TanStack Query or Zustand) so the user doesn't notice the replication lag.

---

## 4. Phase 3: Functional Extraction (10,000 to 50,000 Tenants)

Before sharding the entire database, we extract the heaviest, non-transactional workloads to specialized external systems.

### 4.1 Vector Extraction (Dedicated Vector DB)
If the embedding count exceeds ~50 Million rows, `pgvector` on the primary becomes difficult to manage during backups and index rebuilds.
- **Action**: Migrate `ai.embeddings` to a dedicated Pinecone or Milvus cluster.
- **Impact**: We lose the ability to do single-query hybrid search (SQL JOINs between `listings` and `embeddings`). The backend must implement a two-pass scatter-gather search:
  1. Fetch top 1000 IDs from Pinecone based on vector similarity.
  2. Query Postgres `SELECT * FROM listings WHERE id IN (...) AND status = 'active'`.

### 4.2 Analytics Extraction (ClickHouse)
- **Action**: Stream `analytics.raw_events` and `discovery.search_logs` out of Postgres via Kafka into ClickHouse.
- **Impact**: Frees up massive amounts of disk space and CPU on the Supabase Primary, ensuring the transactional core remains pristine.

---

## 5. Phase 4: Regional Sharding (50,000+ Tenants)

For extreme scale and data sovereignty (GDPR/CCPA compliance), the single global database is partitioned by geography.

### 5.1 The Cell-Based Architecture
- **Cell A (US-East)**: A complete, isolated Supabase instance (Auth, Postgres, Realtime, Storage) handling US tenants.
- **Cell B (EU-Central)**: A complete, isolated Supabase instance handling EU tenants.
- **Global Router**: Vercel Edge Middleware intercepts the incoming request, reads the requested tenant domain (e.g., `eu-marketplace.com`), and routes the API calls to the correct Supabase Cell.

### 5.2 Global State Synchronization
The only data that MUST be synchronized globally is the Global Tenant Directory (so the router knows which tenant lives in which cell). This is managed via an external global KV store (e.g., Redis Global Datastore or Vercel Edge Config).
