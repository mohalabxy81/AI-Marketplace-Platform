# 16. OBSERVABILITY ARCHITECTURE

> **Status**: Approved
> **Target Audience**: SREs, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Observability Paradigm

A unified PostgreSQL architecture means that when performance degrades, it is critical to determine whether the bottleneck is CPU bound (too many connections), I/O bound (unindexed queries, massive vector scans), or Memory bound (caching issues). 

The platform relies on the **Three Pillars of Observability**: Metrics, Logs, and Traces, strictly contextualized by `tenant_id`.

---

## 2. Database Metrics (`pg_stat_statements`)

The `pg_stat_statements` extension is the primary tool for identifying slow queries.

### 2.1 Continuous Query Profiling
A background monitoring agent queries `pg_stat_statements` every 60 seconds and pushes the metrics to Datadog/Grafana.

**Key Metrics Tracked:**
1. `calls`: How often a query is run. (Sudden spikes indicate an N+1 issue in the frontend or an infinite loop in an Edge Function).
2. `mean_exec_time`: Average execution time. (Queries > 100ms require investigation).
3. `shared_blks_read` vs `shared_blks_hit`: Cache hit ratio. (If `read` is high, the database is thrashing the disk, indicating missing indexes or undersized RAM).

### 2.2 Alerting Thresholds
- **Warning**: Database CPU > 70% for 5 minutes.
- **Critical**: Active PgBouncer connections > 90% of pool limit.
- **Critical**: `mean_exec_time` for `marketplace.listings` SELECT operations > 500ms.

---

## 3. Structured Logging

Logs from PostgREST, GoTrue, Realtime, and Postgres are aggregated into a centralized logging platform (e.g., Logflare or Datadog).

### 3.1 Trace IDs (Correlation IDs)
Every request entering the Next.js API or Edge Function is assigned an `x-request-id`. This UUID is passed to Supabase via a custom HTTP header. PostgREST injects this into the Postgres session.

```sql
-- Fetching the trace ID inside a database trigger or function
SELECT current_setting('request.headers', true)::jsonb ->> 'x-request-id';
```

This allows SREs to trace a failing user action in the frontend entirely through to the exact SQL query that failed in the backend.

---

## 4. AI & Vector Observability

AI workloads have vastly different performance profiles than standard CRUD operations.

### 4.1 Token Monitoring
Every call to an LLM via an Edge Function must log the exact latency, model version, and token count to `ai.inference_logs`.

```sql
CREATE TABLE ai.inference_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    trace_id TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    latency_ms INT NOT NULL,
    status TEXT NOT NULL,        -- 'success', 'rate_limited', 'timeout'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 HNSW Index Monitoring
Vector index performance degrades if the data distribution changes rapidly without a reindex.
- **Metric**: The number of rows scanned during a similarity search.
- **Trigger**: If the average latency of `ai.embeddings` similarity searches exceeds 200ms, an alert fires for an SRE to manually trigger a `REINDEX INDEX CONCURRENTLY`.

---

## 5. Audit Logging (Governance)

While metrics are for machines, Audit Logs are for humans (and compliance auditors).

### 5.1 The Immutable Audit Trail
The `governance.audit_logs` table tracks every sensitive action on the platform (e.g., Tenant Admin changes a billing plan, User deletes a listing).

- **Implementation**: Trigger-based for direct database changes, and explicit application-level inserts for complex flows (like logins).
- **Security**: The table uses an `INSTEAD OF UPDATE OR DELETE` rule to silently reject any modification attempt, guaranteeing cryptographic immutability for SOC2 compliance.
