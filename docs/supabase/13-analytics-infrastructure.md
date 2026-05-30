# 13. ANALYTICS INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: Data Engineers, Analytics Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Analytics Paradigm

The platform requires both **Tenant-facing Analytics** (e.g., a dashboard showing a seller their listing views) and **Platform-facing Analytics** (e.g., global AI token usage and churn rate). 

Because transactional queries (CRUD) and analytical queries (OLAP) have conflicting access patterns, we strictly isolate analytical workloads to avoid degrading the core marketplace performance.

---

## 2. Event Ingestion Pipeline

### 2.1 The Raw Telemetry Table
Client-side telemetry (e.g., Next.js tracking a `page_view` or `button_click`) is ingested into a high-throughput, partitioned table.

```sql
CREATE TABLE analytics.raw_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    user_id UUID,
    session_id UUID NOT NULL,
    event_type TEXT NOT NULL,       -- 'page_view', 'listing_impressed', 'ai_interaction'
    resource_id UUID,               -- e.g., the listing_id
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Example Partition
-- CREATE TABLE analytics.raw_events_2026_05 PARTITION OF analytics.raw_events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

### 2.2 Ingestion via Edge Functions
Frontend clients do NOT write directly to `analytics.raw_events` via PostgREST to prevent abuse.
1. The frontend batches events every 5 seconds.
2. It sends a single HTTP POST to an Edge Function (`/functions/v1/telemetry-ingest`).
3. The Edge Function validates the JWT, ensures `tenant_id` matches, sanitizes the payload (removes PII), and executes a bulk `INSERT` using the Service Role Key.

---

## 3. Data Marts & Rollups

Running `COUNT(*)` over a 500-million row `raw_events` table for a tenant's dashboard will time out. We use **PostgreSQL Materialized Views** and **pg_cron** to create daily rollups.

### 3.1 The Daily Aggregation Job
Scheduled via `pg_cron` to run at 00:05 UTC every night.

```sql
CREATE MATERIALIZED VIEW analytics.daily_listing_stats AS
SELECT 
    tenant_id,
    resource_id AS listing_id,
    DATE_TRUNC('day', created_at) AS metric_date,
    COUNT(*) FILTER (WHERE event_type = 'listing_view') AS views,
    COUNT(*) FILTER (WHERE event_type = 'listing_save') AS saves,
    COUNT(*) FILTER (WHERE event_type = 'listing_click') AS clicks
FROM analytics.raw_events
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE
GROUP BY tenant_id, resource_id, DATE_TRUNC('day', created_at);

-- Index for fast tenant dashboard reads
CREATE UNIQUE INDEX idx_daily_stats ON analytics.daily_listing_stats(tenant_id, listing_id, metric_date);
```

### 3.2 Tenant Analytics APIs
When the Next.js tenant dashboard requests analytics, it queries the Materialized Views, NEVER the raw event tables.

```sql
-- RLS Policy on Materialized View (requires a standard view wrapper or explicit grants, as MatViews don't support standard RLS directly in older PG versions, but can be wrapped).
CREATE VIEW analytics.vw_tenant_daily_stats AS
SELECT * FROM analytics.daily_listing_stats
WHERE tenant_id = auth.jwt_tenant_id();
```

---

## 4. Scaling to ClickHouse

While PostgreSQL handles transactional data flawlessly, once the platform exceeds ~100GB of raw analytics data per month, Postgres becomes cost-prohibitive for purely analytical workloads.

### 4.1 The Extraction Architecture (Phase 3)
When hitting the 100M+ row scale:
1. `analytics.raw_events` is truncated to only hold 7 days of hot data.
2. A Debezium CDC Connector (or Supabase Logflare integration) streams all inserts from `analytics.raw_events` to Kafka.
3. Kafka ingests the events into **ClickHouse**.
4. Supabase queries ClickHouse via a Foreign Data Wrapper (clickhousedb_fdw) OR the Next.js backend bypasses Supabase for analytics and queries ClickHouse directly.
