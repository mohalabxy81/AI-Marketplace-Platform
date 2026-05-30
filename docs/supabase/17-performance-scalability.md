# 17. PERFORMANCE & SCALABILITY

> **Status**: Approved
> **Target Audience**: Database Architects, Platform Engineers
> **Domain**: Operations & Scaling

## 1. Executive Summary
Scaling a monolithic Postgres instance requires meticulous index planning, connection management, and offloading non-transactional workloads. The platform is designed to scale vertically to massive instances (e.g., AWS r6g.16xlarge) before horizontal sharding is required.

## 2. Bottleneck Analysis & Mitigations

### 2.1 Database Connection Exhaustion
- **Bottleneck**: Next.js Serverless functions opening thousands of simultaneous connections during traffic spikes.
- **Mitigation**: PgBouncer is deployed via Supabase. All Next.js and Edge Function queries route through the transaction-mode connection pool (port 6543) rather than directly to Postgres (port 5432).

### 2.2 pgvector HNSW Index Bloat
- **Bottleneck**: HNSW indexes consume massive amounts of RAM. If the working set exceeds available memory, vector search slows to a crawl (disk thrashing).
- **Mitigation**: 
  - Embeddings older than 12 months for inactive listings are moved to cold storage (partitioning).
  - Memory usage is continuously monitored. The DB RAM must be sized to hold 100% of the HNSW index in memory.

### 2.3 Realtime Thundering Herd
- **Bottleneck**: If the WebSocket server restarts, 50,000 clients attempt to reconnect simultaneously, overwhelming the auth service.
- **Mitigation**: Client-side SDK enforces exponential backoff with random jitter.

### 2.4 Analytics Write Amplification
- **Bottleneck**: High-velocity clickstream inserts locking Postgres tables.
- **Mitigation**: Pure clickstream telemetry completely bypasses Postgres and flows directly into ClickHouse via Kafka.

### 2.5 RLS Evaluation Overhead
- **Bottleneck**: Complex RLS policies with `EXISTS` or `JOIN` clauses run on every row returned.
- **Mitigation**: 
  1. All RLS rules rely on `current_setting('request.jwt.claims', true)::jsonb` (scalar operations).
  2. Covering indexes are applied to the `tenant_id` column on every tenant-scoped table.
