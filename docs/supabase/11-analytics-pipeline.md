# 11. ANALYTICS PIPELINE

> **Status**: Approved
> **Target Audience**: Data Engineers, Analytics Team
> **Domain**: Analytics Infrastructure

## 1. Executive Summary
The Analytics Pipeline tracks usage, conversion, and health metrics without impacting the performance of the core transactional Postgres databases. High-velocity events are routed to ClickHouse, while materialized aggregates are pulled back into Postgres for dashboard rendering.

## 2. Event Ingestion
- **Source**: Client-side trackers (Next.js), Edge Functions, and Postgres Outbox.
- **Transport**: Kafka / Redis Streams.
- **Destination**: ClickHouse (OLAP).
- **Scale**: Designed to handle 10,000+ events per second.

## 3. Analytical Models

### 3.1 Snapshots & Aggregation
- **Mechanism**: ClickHouse Materialized Views aggregate raw clickstream data into minute/hour/day buckets.
- **Usage**: Dashboards query these pre-computed tables rather than scanning millions of raw rows.
- **Sync**: A daily cron job (Edge Function) pulls daily aggregates from ClickHouse and stores them in the Postgres `analytics` schema to provide sub-10ms dashboard loads for tenants.

### 3.2 Funnels & Cohorts
- **Funnels**: Track the drop-off from `Search` -> `View Listing` -> `Submit Lead` -> `Deal Closed`.
- **Cohorts**: Group users by the week they signed up to measure long-term retention.
- **Execution**: Complex Funnel and Cohort queries run exclusively on ClickHouse to utilize columnar processing speeds.

### 3.3 AI Analytics
- Track the cost-per-inference and latency of the AI models.
- Correlate AI Recommendation Engine output to actual conversion rates (e.g., "Did the Neural Ranker generate more leads than the Keyword Ranker?").

### 3.4 Revenue Analytics
- Track Monthly Recurring Revenue (MRR), Churn, and Average Revenue Per User (ARPU).
- Data sourced directly from Stripe Webhooks stored in the `billing` domain.

## 4. Tenant Isolation
- ClickHouse queries MUST enforce a `tenant_id` WHERE clause.
- When syncing data back to Postgres, it is stored in `analytics.tenant_snapshots` with strict RLS policies ensuring users only see their own organization's metrics.
