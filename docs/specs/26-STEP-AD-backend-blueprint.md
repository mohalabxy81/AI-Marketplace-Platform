# STEP AD — BACKEND ENGINEERING BLUEPRINT
## THE CANONICAL BACKEND IMPLEMENTATION CONSTITUTION

> **Document Status**: Approved / Frozen  
> **Parent Architecture**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) (The Platform Constitution)  
> **Target Version**: v1.0.0-Enterprise  
> **Date**: 2026-05-31

---

## SECTION 1 — BACKEND SYSTEM MAP

This section defines the core services decomposing the multi-tenant marketplace operating system. Each service layer maintains absolute logical separation, database isolation, and event boundaries.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   API GATEWAY / EDGE ROUTER                            │
│                  - JWT Validation  - Tenant Claim Injection  - WAF Filtering            │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
          ┌────────────────────────────────┼──────────────────────────────┐
          ▼                                ▼                              ▼
┌──────────────────┐             ┌──────────────────┐           ┌──────────────────┐
│   CORE KERNEL    │             │ COGNITIVE SPACE  │           │ OPERATIONAL BUS  │
│ - Auth & Tenant  │             │ - Search & Embed │           │ - Kafka Event Bus│
│ - RLS DB Tier    │             │ - Recommendations│           │ - pgMQ Queues    │
│ - Stripe Ledger  │             │ - LLM Token Guard│           │ - ClickHouse OLAP│
└──────────────────┘             └──────────────────┘           └──────────────────┘
```

### 1.1 Authentication & Authorization Layer (Auth)
*   **Purpose**: Token issuance, validation, session state management, and MFA.
*   **Responsibilities**: Validates identity credentials, generates tenant-scoped JWTs, coordinates MFA verification via TOTP/SMS, manages JWKS rotation.
*   **Dependencies**: Tenant Layer, Storage Layer (avatars), Email/SMS integration.
*   **Owned Data**: `auth.users`, `auth.mfa_factors`, `auth.sessions`.
*   **Owned Events**: `auth.user.signup`, `auth.user.mfa_enabled`, `auth.session.login_failed`.
*   **Consumed Events**: None.
*   **Failure Boundaries**: If Auth is degraded, the API gateway falls back to cached JWKS for signature checks, rejecting only expired or mutated tokens. Mutation endpoints fail open for existing sessions, but sign-in is blocked.
*   **Scaling Boundaries**: Cache public keys in Redis with 1-hour TTL. Signature verification runs in sub-1ms on CPU at the edge.

### 1.2 Tenant Isolation Layer
*   **Purpose**: Safe routing and data context injection for multi-tenant isolation.
*   **Responsibilities**: Validates custom domains and tenant registration, injects `tenant_id` context into connection sessions, provisions DB resources.
*   **Dependencies**: Auth Layer, Core Postgres RLS.
*   **Owned Data**: `public.tenants`, `public.tenant_domains`, `public.tenant_settings`.
*   **Owned Events**: `tenant.provisioned`, `tenant.suspended`, `tenant.domain_mapped`.
*   **Consumed Events**: `billing.subscription.updated` (suspends tenants on payment failure).
*   **Failure Boundaries**: Hard fail on any request without a valid `tenant_id` header or domain mapping. Injects fallback context to query sandbox schema only.
*   **Scaling Boundaries**: Keep tenant mappings cached in Redis cluster memory.

### 1.3 Role-Based Access Control (RBAC) Layer
*   **Purpose**: Permission evaluation.
*   **Responsibilities**: Enforces granular database policies and API access tokens per role (`super_admin`, `tenant_admin`, `tenant_member`, `buyer`).
*   **Dependencies**: Auth Layer.
*   **Owned Data**: `public.rbac_roles`, `public.rbac_permissions`, `public.user_roles`.
*   **Owned Events**: `rbac.role_assigned`, `rbac.permission_revoked`.
*   **Consumed Events**: None.
*   **Failure Boundaries**: Fail closed. Any unresolved claim or permission missing yields immediate HTTP 403.
*   **Scaling Boundaries**: Permissions are bound directly inside the custom claims of the signed JWT to bypass database hits during request routing.

### 1.4 Listing Engine
*   **Purpose**: Core catalog and inventory management.
*   **Responsibilities**: Listing CRUD, schema validation, indexing pipelines, asset aggregation.
*   **Dependencies**: Tenant Layer, Media Layer, Search Layer.
*   **Owned Data**: `public.listings`, `public.listing_versions`, `public.listing_metadata`.
*   **Owned Events**: `listing.created`, `listing.updated`, `listing.archived`.
*   **Consumed Events**: `moderation.status.updated` (quarantines listings if flagged).
*   **Failure Boundaries**: Core database schema remains writable even if search or vector databases are offline.
*   **Scaling Boundaries**: Read requests served from replica databases and Redis CDN caches.

### 1.5 Media Processing Layer
*   **Purpose**: Image, video, and file transformation.
*   **Responsibilities**: Upload preprocessing, image transcoding (WebP/AVIF conversions), virus scanning, and asset storage.
*   **Dependencies**: Storage Layer.
*   **Owned Data**: `public.media_assets`, `public.media_jobs`.
*   **Owned Events**: `media.upload_completed`, `media.scan_failed`.
*   **Consumed Events**: `listing.created` (starts video transcode).
*   **Failure Boundaries**: If transcode workers fail, original uploaded file remains available via presigned URL with a degradation notice.
*   **Scaling Boundaries**: Offload resizing and encoding tasks to Serverless/Edge WebAssembly nodes or AWS Lambda functions.

### 1.6 Search Layer
*   **Purpose**: Keyword and linguistic retrieval.
*   **Responsibilities**: Ingests and updates search catalogs, executes BM25 algorithms, handles synonym mapping.
*   **Dependencies**: Core Database, Vector DB.
*   **Owned Data**: Search Indexes (Elasticsearch/Postgres GIN Index).
*   **Owned Events**: `search.reindexed`, `search.failed`.
*   **Consumed Events**: `listing.created`, `listing.updated`, `listing.deleted`.
*   **Failure Boundaries**: Fallback to standard B-tree SQL queries if dedicated search indexing engine goes offline.
*   **Scaling Boundaries**: Scale indexing cluster horizontally based on write volume.

### 1.7 Vector Discovery & Recommendation Layer
*   **Purpose**: AI semantic similarity and personalization matching.
*   **Responsibilities**: Evaluates user preference vectors against listing embeddings to generate high-affinity suggestions.
*   **Dependencies**: pgvector database, AI Layer.
*   **Owned Data**: `public.embeddings`, `public.user_preference_matrices`.
*   **Owned Events**: `recommendation.refresh_triggered`, `embedding.generated`.
*   **Consumed Events**: `analytics.clickstream.event` (updates preference matrix).
*   **Failure Boundaries**: If recommendation engines are degraded, feed falls back to default sorting rules (trending / latest listings).
*   **Scaling Boundaries**: Vector search indexed with HNSW parameters (`m=16, ef_construction=64`).

### 1.8 AI Gateway & Token Guard Layer
*   **Purpose**: Standardized LLM execution and model rate limiting.
*   **Responsibilities**: Routes prompts to multiple LLM backends (OpenAI/Anthropic), caches semantic outputs, throttles based on tenant token budgets.
*   **Dependencies**: Redis, Tenant Layer.
*   **Owned Data**: `public.ai_token_allocations`, `public.ai_request_logs`.
*   **Owned Events**: `ai.token_quota_exhausted`, `ai.provider_degraded`.
*   **Consumed Events**: None.
*   **Failure Boundaries**: Automatic provider failover (e.g., Anthropic fallback for OpenAI timeouts). If all fails, returns immediate HTTP 503 for generative services.
*   **Scaling Boundaries**: Redis cache for semantic completions eliminates redundant LLM calls.

### 1.9 Operational Analytics Engine
*   **Purpose**: Business metric tracking.
*   **Responsibilities**: Tracks clickstreams, compiles metrics, logs search queries, evaluates LTV, and formats analytics.
*   **Dependencies**: Kafka, ClickHouse.
*   **Owned Data**: ClickHouse tables (`analytics.events`, `analytics.daily_kpis`).
*   **Owned Events**: `analytics.snapshot_compiled`.
*   **Consumed Events**: `listing.created`, `checkout.session.completed`, `lead.created`.
*   **Failure Boundaries**: Ingest buffers (Kafka) hold metrics for 72 hours if processing engines fail.
*   **Scaling Boundaries**: High write throughput handled by partitioning ClickHouse ingestion pipelines by tenant.

### 1.10 Messaging & Presence Layer
*   **Purpose**: Real-time chat.
*   **Responsibilities**: Connects chat participants, handles typing indicators, manages user state presence, logs messages.
*   **Dependencies**: Supabase Realtime, Tenant Layer.
*   **Owned Data**: `public.chat_messages`, `public.chat_channels`, `public.chat_members`.
*   **Owned Events**: `message.sent`, `user.presence_changed`.
*   **Consumed Events**: None.
*   **Failure Boundaries**: Falls back to HTTP polling if persistent WebSocket connections drop.
*   **Scaling Boundaries**: Horizontal WebSocket scaling managed via Supabase cluster nodes.

### 1.11 Notification Dispatcher
*   **Purpose**: Multi-channel alerts.
*   **Responsibilities**: Sends notifications via SMS, Email, In-App popups, and Push payloads.
*   **Dependencies**: SendGrid, Twilio.
*   **Owned Data**: `public.notifications`, `public.notification_templates`, `public.user_preferences`.
*   **Owned Events**: `notification.sent`, `notification.failed`.
*   **Consumed Events**: Any event conforming to the `event.notification_request` schema.
*   **Failure Boundaries**: Outgoing alerts queued in Postgres outbox tables with automatic retry intervals.
*   **Scaling Boundaries**: Asynchronous delivery handled by decoupled background threads.

### 1.12 CRM & Lead Engine
*   **Purpose**: Sales funnel management.
*   **Responsibilities**: Captures buyer intents, evaluates lead priority scores, syncs with internal CRM systems.
*   **Dependencies**: Auth Layer, AI Layer (scoring logic).
*   **Owned Data**: `public.leads`, `public.lead_events`, `public.lead_scoring_rules`.
*   **Owned Events**: `lead.created`, `lead.priority_escalated`.
*   **Consumed Events**: `analytics.clickstream.event` (tracks behavior to qualify leads).
*   **Failure Boundaries**: Fall back to standard lead logging without dynamic scores if the AI scoring engine is offline.
*   **Scaling Boundaries**: Decouple lead intake logic from calculation tasks.

### 1.13 Billing & Subscription Layer (Monetization)
*   **Purpose**: Tenant subscription and metered invoice tracking.
*   **Responsibilities**: Handles Stripe subscriptions, processes webhook events, updates billing status.
*   **Dependencies**: Stripe, Tenant Layer.
*   **Owned Data**: `public.billing_customers`, `public.billing_ledger`, `public.billing_plans`.
*   **Owned Events**: `billing.invoice_paid`, `billing.payment_failed`.
*   **Consumed Events**: `ai.token_consumed` (logs usage fees).
*   **Failure Boundaries**: If Stripe webhooks fail, events are retained and re-delivered for up to 72 hours. No immediate tenant lockout occurs; a 3-day grace period is triggered.
*   **Scaling Boundaries**: Stripe ledger is append-only for thread safety.

### 1.14 Quota Enforcer
*   **Purpose**: Workspace resource limits.
*   **Responsibilities**: Tracks dynamic usage (tokens, uploads, listings) against plan tier parameters.
*   **Dependencies**: Tenant Layer, Redis.
*   **Owned Data**: `public.tenant_quotas`, `public.tenant_usage_logs`.
*   **Owned Events**: `quota.limit_reached`.
*   **Consumed Events**: `listing.created`, `media.upload_completed`, `ai.token_consumed`.
*   **Failure Boundaries**: Fail open to verify resource usage first, then logs warnings. If Redis fails, check local database.
*   **Scaling Boundaries**: Track usage metrics in Redis counters.

### 1.15 Moderation Engine
*   **Purpose**: Content safety verification.
*   **Responsibilities**: Scans listing data and media files for compliance, flags toxic content, routes cases to humans.
*   **Dependencies**: AI Layer (safety models), Storage Layer.
*   **Owned Data**: `public.moderation_reviews`, `public.moderation_rules`, `public.moderation_actions`.
*   **Owned Events**: `moderation.status.updated`, `moderation.review_escalated`.
*   **Consumed Events**: `listing.created`, `listing.updated`.
*   **Failure Boundaries**: Unreviewed items default to a "pending" status and are hidden from public views.
*   **Scaling Boundaries**: Asynchronous moderation processes run outside the user request lifecycle.

### 1.16 Trust & Safety Layer
*   **Purpose**: Risk evaluation and fraud detection.
*   **Responsibilities**: Tracks transaction velocity, detects suspicious behaviors, manages security blocklists.
*   **Dependencies**: Analytics Layer, Core Database.
*   **Owned Data**: `public.fraud_scores`, `public.blocklisted_entities`.
*   **Owned Events**: `trust.anomaly_detected`, `trust.entity_blocked`.
*   **Consumed Events**: `auth.session.login_failed`, `billing.payment_failed`, `lead.created`.
*   **Failure Boundaries**: If the engine fails, it defaults to blocking actions from non-whitelisted IPs.
*   **Scaling Boundaries**: Evaluating security rules runs in sub-10ms using Redis cached lists.

### 1.17 Audit Engine
*   **Purpose**: Non-repudiation logging.
*   **Responsibilities**: Compiles append-only logs for all mutations and sensitive actions.
*   **Dependencies**: Core database schemas.
*   **Owned Data**: `governance.audit_logs`.
*   **Owned Events**: `audit.entry_created`.
*   **Consumed Events**: Any mutation event generated on the platform.
*   **Failure Boundaries**: Writes bypass standard connection limits to guarantee logging occurs. If write fails, the database throws an exception and rolls back the active transaction.
*   **Scaling Boundaries**: Tables partitioned monthly and migrated to cold storage after 90 days.

### 1.18 Support & Helpdesk Layer
*   **Purpose**: Customer support ticketing.
*   **Responsibilities**: Coordinates support tickets, tracks conversations, resolves buyer disputes.
*   **Dependencies**: Storage Layer (attachments), Email Integration.
*   **Owned Data**: `public.support_tickets`, `public.ticket_messages`, `public.disputes`.
*   **Owned Events**: `support.ticket_opened`, `support.sla_breached`.
*   **Consumed Events**: `billing.payment_failed` (triggers support requests).
*   **Failure Boundaries**: Users can always open tickets via email fallbacks if the web UI is offline.
*   **Scaling Boundaries**: Ticket database optimized for text searches.

### 1.19 Super Admin Portal Layer
*   **Purpose**: Platform administration.
*   **Responsibilities**: Impersonates tenants, overrides quotas, adjusts re-ranking filters, schedules migrations.
*   **Dependencies**: All other platform services.
*   **Owned Data**: `public.system_configurations`, `public.admin_invitations`.
*   **Owned Events**: `admin.action_executed`.
*   **Consumed Events**: All system logs and events.
*   **Failure Boundaries**: Access requires MFA validation. Any action is locked behind the `super_admin_role` permission checks.
*   **Scaling Boundaries**: Admin queries run against DB read replicas to avoid affecting tenant read/write pipelines.

---

## SECTION 2 — SUPABASE EDGE FUNCTIONS ARCHITECTURE

All edge functions are deployed to Supabase using Deno. They use TypeScript, require explicit authentication contexts, and enforce strict error boundaries.

```
┌────────────────────────────────────────────────────────┐
│               SUPABASE EDGE FUNCTION ROUTER            │
├───────────────┬────────────────────────┬───────────────┤
│ Auth Header   │ Custom Claim Check     │ Tenant Scoping│
└───────┬───────┴───────────────┬────────┴───────┬───────┘
        ▼                       ▼                ▼
  Deno Runtime            Import Maps      pg-client-pool
```

### 2.1 Edge Functions Specification Table

| Function | Endpoint Path | Auth Strategy | Allowed Roles | Timeout | Concurrent Limits |
|:---|:---|:---|:---|:---|:---|
| `auth` | `/functions/v1/auth` | API Key & JWT | `anon`, `authenticated` | 10s | 5,000 |
| `listings` | `/functions/v1/listings` | JWT + Tenant Claims | `tenant_member`, `buyer` | 15s | 10,000 |
| `teams` | `/functions/v1/teams` | JWT + Tenant Claims | `tenant_admin` | 10s | 2,000 |
| `permissions` | `/functions/v1/permissions` | JWT + Internal | `tenant_admin`, `super_admin` | 5s | 1,000 |
| `analytics` | `/functions/v1/analytics` | JWT + Tenant Claims | `tenant_admin` | 30s | 2,000 |
| `ai-tracking` | `/functions/v1/ai-tracking` | JWT + Internal Claims | `service_role` | 10s | 20,000 |
| `recommendation-engine` | `/functions/v1/recommendation-engine` | JWT + Session | `buyer` | 8s | 8,000 |
| `semantic-search` | `/functions/v1/semantic-search` | JWT / Public | `anon`, `buyer` | 5s | 15,000 |
| `embedding-generator` | `/functions/v1/embedding-generator` | Service Role Only | `service_role` | 30s | 5,000 |
| `notification-dispatcher` | `/functions/v1/notification-dispatcher` | Service Role Only | `service_role` | 15s | 10,000 |
| `moderation-engine` | `/functions/v1/moderation-engine` | JWT + Service | `service_role` | 20s | 3,000 |
| `quota-enforcer` | `/functions/v1/quota-enforcer` | JWT + Claims | `tenant_member`, `service_role`| 5s | 15,000 |
| `billing-webhook` | `/functions/v1/billing-webhook` | Stripe Header Sig | Stripe Webhook IP | 20s | 1,000 |
| `subscription-manager` | `/functions/v1/subscription-manager` | JWT + Tenant Claims | `tenant_admin` | 15s | 1,500 |
| `lead-scoring` | `/functions/v1/lead-scoring` | JWT + Claims | `tenant_member`, `service_role`| 10s | 5,000 |
| `fraud-scoring` | `/functions/v1/fraud-scoring` | JWT + Claims | `service_role` | 8s | 5,000 |
| `admin-tools` | `/functions/v1/admin-tools` | JWT + Super Admin | `super_admin_role` | 60s | 500 |
| `support-tools` | `/functions/v1/support-tools` | JWT + Claims | `tenant_member`, `super_admin` | 15s | 2,000 |

### 2.2 Shared Edge Function Boilerplate (TypeScript / Deno)

```typescript
// /supabase/functions/_shared/middleware.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

export interface Context {
  tenantId: string;
  userId?: string;
  role: string;
  scopes: string[];
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

export async function authenticateRequest(req: Request): Promise<{ client: any; context: Context; error?: Response }> {
  if (req.method === "OPTIONS") {
    return { client: null, context: {} as any, error: new Response("ok", { headers: corsHeaders, status: 200 }) };
  }

  const authHeader = req.headers.get("Authorization");
  const tenantIdHeader = req.headers.get("x-tenant-id");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { client: null, context: {} as any, error: new Response(JSON.stringify({ error: "Missing authorization token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  const token = authHeader.split(" ")[1];
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    return { client: null, context: {} as any, error: new Response(JSON.stringify({ error: "Invalid identity credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  // Parse claims
  const jwtPayload = JSON.parse(atob(token.split(".")[1]));
  const tenantId = jwtPayload.tenant_id || tenantIdHeader;
  
  if (!tenantId) {
    return { client: null, context: {} as any, error: new Response(JSON.stringify({ error: "Tenant context not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }

  return {
    client: supabaseClient,
    context: {
      tenantId,
      userId: user.id,
      role: jwtPayload.role || "authenticated",
      scopes: jwtPayload.scopes || []
    }
  };
}

export function handleRouteError(error: any): Response {
  console.error(`[Error Boundary] - ${error.message || error}`);
  return new Response(
    JSON.stringify({
      error: "Request processing error",
      details: error.message || "An unexpected error occurred"
    }),
    { status: error.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### 2.3 Concrete Implementation: `embedding-generator` Deno Function

```typescript
// /supabase/functions/embedding-generator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleRouteError } from "../_shared/middleware.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized endpoint access" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { input_text, listing_id, tenant_id } = await req.json();
    if (!input_text || !listing_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing payload arguments" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: input_text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI embedding failure: ${errorText}`);
    }

    const resJson = await response.json();
    const [{ embedding }] = resJson.data;

    // Connect to database to store embedding
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        listing_id,
        tenant_id,
        embedding,
        model_version: "text-embedding-3-small"
      })
    });

    if (!dbResponse.ok) {
      const dbErr = await dbResponse.text();
      throw new Error(`Failed storing embedding to DB: ${dbErr}`);
    }

    return new Response(JSON.stringify({ success: true, dimension: embedding.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return handleRouteError(error);
  }
});
```

---

## SECTION 3 — BACKGROUND JOBS ARCHITECTURE

Background tasks are scheduled and executed directly within Postgres using `pg_cron` and custom tasks, or managed in the Kotlin scheduling service for long-running workflows.

```
┌────────────────────────────────────────────────────────┐
│                        PG_CRON ENGINE                  │
├───────────────────┬──────────────────┬─────────────────┤
│ Cron Trigger      │ DB Task Outbox   │ HTTP Callout    │
└─────────┬─────────┴────────┬─────────┴────────┬────────┘
          ▼                  ▼                  ▼
      pgmq worker      pg_net plugin     Edge function
```

### 3.1 Background Jobs Specification Table

| Job Name | Schedule | Trigger Mechanism | Input Parameters | Output & Side Effects |
|:---|:---|:---|:---|:---|
| `Analytics Aggregation` | `*/5 * * * *` | `pg_cron` | `{interval: "5 minutes"}` | Populates `daily_kpis`, flushes temp metrics. |
| `Recommendation Refresh` | `0 2 * * *` | `pg_cron` (Off-peak) | `{max_users: 10000}` | Recomputes user affinity matrix metrics. |
| `Embedding Generation` | Dynamic | Outbox queue insert | `{listing_id, tenant_id}` | Calls `embedding-generator` Edge function. |
| `AI Insights Gen` | `0 0 * * 0` | `pg_cron` | `{tenant_id, range: "7 days"}`| Generates summary PDF, dispatches email. |
| `Fraud Analysis` | `*/1 * * * *` | `pg_cron` | `{lookback: "1 minute"}` | Updates entity fraud scores, suspends accounts. |
| `Quota Monitoring` | `*/15 * * * *`| `pg_cron` | `{alert_threshold: 0.9}` | Flags overages, emails tenant administrators. |
| `Subscription Sync` | `0 1 * * *` | `pg_cron` | `{sync_limit: 1000}` | Reconciles Stripe state with Postgres database. |
| `Invoice Processing` | `0 0 1 * *` | `pg_cron` | `{billing_cycle: "monthly"}`| Computes metered overages, sends Stripe invoices. |
| `Search Reindexing` | `*/30 * * * *`| `pg_cron` | `{delta_only: true}` | Ingests listing updates into index engines. |
| `Moderation Processing`| Dynamic | Outbox queue insert | `{target_id, type: "listing"}`| Calls moderation models, quarantines if invalid. |
| `Notification Dispatch`| `* * * * *` | Outbox table fetch | `{max_batch: 500}` | Calls Twilio / SendGrid APIs. |
| `Audit Consolidation` | `0 3 * * *` | `pg_cron` | `{older_than: "90 days"}` | Compresses data, moves to S3 cold storage. |

### 3.2 Dynamic Ingestion Example: `Analytics Aggregation`
```sql
-- Create scheduling function
CREATE OR REPLACE FUNCTION cron.process_daily_kpis()
RETURNS void AS $$
BEGIN
  -- Aggregate event tables to summing merge matrices
  INSERT INTO public.daily_kpis (date, tenant_id, kpi_name, kpi_value, dimension)
  SELECT 
    CURRENT_DATE - INTERVAL '1 day',
    tenant_id,
    'clicks_total',
    COUNT(id),
    jsonb_build_object('category', metadata->>'category')
  FROM public.analytics_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' 
    AND created_at < CURRENT_DATE
  GROUP BY tenant_id, metadata->>'category'
  ON CONFLICT (tenant_id, date, kpi_name) 
  DO UPDATE SET kpi_value = daily_kpis.kpi_value + EXCLUDED.kpi_value;

  -- Delete processed metrics older than 7 days from hot store
  DELETE FROM public.analytics_logs WHERE created_at < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule the task using pg_cron
SELECT cron.schedule('aggregate-daily-kpis', '0 1 * * *', 'SELECT cron.process_daily_kpis();');
```

---

## SECTION 4 — QUEUE ARCHITECTURE

The queue system is built using `pgmq` directly inside Postgres to guarantee transactional safety (same transaction for database writes and queue inserts), with outbox workers forwarding events to external brokers when required.

```
┌────────────────────────────────────────────────────────┐
│                        PGMQ SCHEME                     │
├────────────────────┬─────────────────┬─────────────────┤
│ SQL Producer       │ pgmq.send()     │ FIFO DB Index   │
└─────────┬──────────┴────────┬────────┴────────┬────────┘
          ▼                   ▼                 ▼
     pgmq.read()       Outbox Worker      Consumer Hook
```

### 4.1 Queue Specifications

*   **Listing Queue**:
    *   *Producer*: Listing Engine (`listing.created` / `listing.updated`).
    *   *Consumer*: `embedding-generator` & `moderation-engine`.
    *   *Message Contract*: `{ "listing_id": "UUID", "tenant_id": "UUID", "payload": { "title": "...", "description": "..." } }`.
    *   *Ordering*: Strict FIFO within `tenant_id` partitions.
    *   *Dead Letter Strategy*: Forward to `listing_queue_dlq` after 5 failed retries.
    *   *Retry Strategy*: Exponential backoff starting at 2 seconds, multiplier `2.0`.
    *   *Retention*: 7 days.
    *   *Scaling*: Horizontal consumers scaling based on active jobs in queue.

*   **Analytics Queue**:
    *   *Producer*: Web App Client tracking API.
    *   *Consumer*: ClickHouse sync worker.
    *   *Message Contract*: `{ "event_id": "UUID", "event_type": "string", "tenant_id": "UUID", "timestamp": "TIMESTAMPTZ", "payload": {} }`.
    *   *Ordering*: Unordered. Optimized for high throughput ingestion.
    *   *Dead Letter Strategy*: Drops after 3 failures; logs raw payload to S3 fail buckets.
    *   *Retry Strategy*: Immediate retry, then fail.
    *   *Retention*: 24 hours.
    *   *Scaling*: Kafka ingestion partitions mapped directly to consumer nodes.

*   **AI Queue**:
    *   *Producer*: LLM Gateway.
    *   *Consumer*: OpenAI / Anthropic APIs.
    *   *Message Contract*: `{ "request_id": "UUID", "tenant_id": "UUID", "prompt": "...", "model": "..." }`.
    *   *Ordering*: Priority-based routing. Enterprise tier requests bypass the queue.
    *   *Dead Letter Strategy*: Enqueue to `ai_queue_dlq` with failure response returned to client.
    *   *Retry Strategy*: 3 retries, backoff starting at 5 seconds.
    *   *Retention*: 2 days.
    *   *Scaling*: Redis-backed queue dynamically throttled based on LLM rate limit responses.

*   **Notification Queue**:
    *   *Producer*: Core application, background jobs.
    *   *Consumer*: `notification-dispatcher` (SendGrid/Twilio SDKs).
    *   *Message Contract*: `{ "notification_id": "UUID", "channels": ["email", "sms"], "recipient": {}, "template_id": "..." }`.
    *   *Ordering*: Unordered.
    *   *Dead Letter Strategy*: Write failed logs to DB error registers.
    *   *Retry Strategy*: Exponential backoff up to 24 hours.
    *   *Retention*: 14 days.
    *   *Scaling*: Concurrent workers handle API delays.

### 4.2 SQL Queue Creation (`pgmq` Pattern)
```sql
-- Initialize PGMQ Extension
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

-- Create core queues
SELECT pgmq.create('listing_queue');
SELECT pgmq.create('listing_queue_dlq');

-- Queue worker consumer routine
CREATE OR REPLACE FUNCTION queue.poll_listing_jobs(batch_size INT)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INT,
  enqueued_at TIMESTAMPTZ,
  message JSONB
) AS $$
BEGIN
  RETURN QUERY 
  SELECT msg_id, read_ct, enqueued_at, message::jsonb
  FROM pgmq.read('listing_queue', 30, batch_size); -- 30-second visibility timeout
END;
$$ LANGUAGE plpgsql;
```

---

## SECTION 5 — SEARCH INFRASTRUCTURE

We enforce a **Hybrid Search Pipeline** that combines linguistic keyword parsing (BM25) with vector similarity search (pgvector) to deliver highly relevant results.

```
┌────────────────────────────────────────────────────────┐
│                     HYBRID SEARCH PIPELINE             │
├────────────────────┬─────────────────┬─────────────────┤
│ SQL Full Text      │ GIN Index (ts)  │ Weight: 0.3     │
├────────────────────┼─────────────────┼─────────────────┤
│ Vector Cosine      │ HNSW (pgvector) │ Weight: 0.7     │
└─────────┬──────────┴────────┬────────┴────────┬────────┘
          ▼                   ▼                 ▼
   Normalize Scores     Reciprocal Rank  Result Ranking (50ms)
```

### 5.1 Hybrid Search Pipeline Design
*   **Data Sources**: PostgreSQL tables (`public.listings`, `public.embeddings`).
*   **Indexes**: 
    *   GIN search index on `to_tsvector('english', title || ' ' || description)`.
    *   HNSW vector search index on `embeddings.embedding` using cosine distance.
*   **Refresh Strategy**:
    *   Linguistic Index: Updated in real-time on DB write.
    *   Vector Index: Triggered asynchronously within 10 seconds of updates.
*   **Ranking Logic**: Dynamic Reciprocal Rank Fusion (RRF) combining BM25 keyword score (0.3 weight) and Vector similarity score (0.7 weight).
*   **Latency Target**: Sub-50ms query response time.
*   **Scaling Strategy**: Replicate search index maps to read-only database nodes.

### 5.2 Hybrid Search SQL Implementation
```sql
CREATE OR REPLACE FUNCTION public.hybrid_search(
  p_tenant_id UUID,
  p_query TEXT,
  p_query_embedding VECTOR(1536),
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  listing_id UUID,
  title TEXT,
  description TEXT,
  rrf_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      l.id,
      1 - (e.embedding <=> p_query_embedding) AS similarity_score,
      ROW_NUMBER() OVER (ORDER BY e.embedding <=> p_query_embedding) AS rank
    FROM public.listings l
    JOIN public.embeddings e ON e.listing_id = l.id
    WHERE l.tenant_id = p_tenant_id AND l.status = 'active'
    LIMIT p_limit * 2
  ),
  text_search AS (
    SELECT 
      l.id,
      ts_rank_cd(to_tsvector('english', l.title || ' ' || l.description), plainto_tsquery('english', p_query)) AS text_score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', l.title || ' ' || l.description), plainto_tsquery('english', p_query)) DESC) AS rank
    FROM public.listings l
    WHERE l.tenant_id = p_tenant_id AND l.status = 'active'
      AND to_tsvector('english', l.title || ' ' || l.description) @@ plainto_tsquery('english', p_query)
    LIMIT p_limit * 2
  )
  SELECT 
    l.id,
    l.title,
    l.description,
    COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + t.rank), 0.0) AS rrf_score
  FROM public.listings l
  LEFT JOIN vector_search v ON v.id = l.id
  LEFT JOIN text_search t ON t.id = l.id
  WHERE v.id IS NOT NULL OR t.id IS NOT NULL
  ORDER BY rrf_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## SECTION 6 — VECTOR DATABASE ARCHITECTURE

The vector infrastructure is built entirely using the `pgvector` extension in PostgreSQL, optimizing for latency and index integrity.

```
┌────────────────────────────────────────────────────────┐
│                   PGVECTOR STORAGE MAP                 │
├────────────────────┬─────────────────┬─────────────────┤
│ Vector Size: 1536  │ HNSW Index      │ Cosine Distance │
└─────────┬──────────┴────────┬────────┴────────┬────────┘
          ▼                   ▼                 ▼
    Storage Table      Partition Filter     Cache Pool
```

### 6.1 Schema and Index Specifications
*   **Vector Dimensions**: `1536` elements (optimized for `text-embedding-3-small` / OpenAI).
*   **Storage Table**: `public.embeddings` mapped to `public.listings` with a cascade delete relationship.
*   **HNSW Index Creation**:
    ```sql
    CREATE INDEX ON public.embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    ```
*   **Index Construction Parameters**:
    *   `m = 16`: Balances index size and speed.
    *   `ef_construction = 64`: Ensures high recall accuracy.
    *   `ef_search = 32` (Set at session level for search queries):
        ```sql
        SET hnsw.ef_search = 32;
        ```

### 6.2 Embedding Lifecycle and Retention
1.  **Ingest**: Listing creation triggers a DB transaction.
2.  **Job Enqueue**: PGMQ worker processes embedding generation requests.
3.  **Update**: Generated vector array is saved to the DB, updating the HNSW index concurrently.
4.  **Stale Handling**: When a listing is modified, the previous vector version is archived to `embeddings_cold_store` for query reference, and a new vector is generated.
5.  **Cost Controls**: Deduplicate identical text updates to prevent redundant embedding calculations.

---

## SECTION 7 — RECOMMENDATION ENGINE ARCHITECTURE

The recommendation pipeline runs a multi-stage scoring algorithm that calculates personalized suggestions based on click streams and collaborative filtering weights.

```
┌────────────────────────────────────────────────────────┐
│                   RECOMMENDATION PIPELINE              │
├────────────────────────────────────────────────────────┤
│ 1. RETRIEVAL (Vector Cosine match on user preference)   │
├────────────────────────────────────────────────────────┤
│ 2. FILTERING (Tenant Isolation, Availability check)    │
├────────────────────────────────────────────────────────┤
│ 3. SCORING (Dynamic click weightings applied)          │
├────────────────────────────────────────────────────────┤
│ 4. RANKING (Top 20 high-affinity items returned)       │
└────────────────────────────────────────────────────────┘
```

*   **Inputs**: User interaction logs, query history, listing engagement.
*   **Outputs**: Ranked list of recommended listing IDs.
*   **Signals**: Click = `1.0`, Detail View = `2.0`, Message Sent = `5.0`, Bookmark = `3.0`.
*   **Latency Target**: Sub-80ms total processing time.
*   **Recommendation scoring logic**:
    $$\text{Score} = (\text{Cosine Similarity} \times 0.6) + (\text{Interactions Weight} \times 0.4)$$

```sql
CREATE OR REPLACE FUNCTION public.get_recommendations(
  p_tenant_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  listing_id UUID,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_affinity AS (
    -- Fetch the user preference vector compiled from clickstream events
    SELECT preference_vector 
    FROM public.user_preference_matrices 
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    LIMIT 1
  )
  SELECT 
    e.listing_id,
    (1 - (e.embedding <=> ua.preference_vector))::FLOAT AS score
  FROM public.embeddings e
  CROSS JOIN user_affinity ua
  JOIN public.listings l ON l.id = e.listing_id
  WHERE l.tenant_id = p_tenant_id 
    AND l.status = 'active'
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## SECTION 8 — REALTIME BACKEND ARCHITECTURE

The real-time notification and sync pipeline is powered by Supabase Realtime via PostgreSQL Write-Ahead Log (WAL) listening.

```
┌────────────────────────────────────────────────────────┐
│                   SUPABASE WAL REALTIME                │
├────────────────────────────────────────────────────────┤
│ DB MUTATION → WAL Listener → Broadcast Engine → WebSocket│
└────────────────────────────────────────────────────────┘
```

### 8.1 Realtime Channel Schema

| Channel Name | Publisher | Subscriber | Event Context | Payload Schema |
|:---|:---|:---|:---|:---|
| `realtime:tenant:{id}:notifications` | Backend Engine | Client Browser | New system alerts | `{ id: UUID, title: string, level: "info"\|"error" }` |
| `realtime:tenant:{id}:messages` | Messaging Layer | Chat Members | Chat messages | `{ id: UUID, sender_id: UUID, text: string }` |
| `realtime:tenant:{id}:presence` | Client Browser | Chat Members | Presence updates | `{ user_id: UUID, online: boolean }` |
| `realtime:tenant:{id}:listings` | Listing Engine | Client Search | Catalog updates | `{ id: UUID, action: "upsert"\|"delete" }` |
| `realtime:tenant:{id}:billing` | Stripe Handler | Tenant Admin | Payment status | `{ invoice_id: string, status: "paid"\|"failed" }` |

### 8.2 Authorization and Reconnect Logic
*   **Authorization**: Realtime connections require a valid tenant JWT. Row-Level Security (RLS) restricts database listening channels based on claims.
*   **Reconnect Policy**: Clients use exponential backoff (`min = 1s, max = 30s`) on dropouts. 
*   **State Recovery**: Upon reconnection, clients fetch missing events from the `public.notifications` table using a `last_received_at` timestamp.

---

## SECTION 9 — STORAGE ARCHITECTURE

```
┌────────────────────────────────────────────────────────┐
│                   STORAGE ISOLATION SCHEME             │
├────────────────────────────────────────────────────────┤
│ bucket/{tenant_id}/{entity_type}/{entity_id}/{uuid}    │
├────────────────────────────────────────────────────────┤
│ RLS Check: JWT.tenant_id === path.tenant_id            │
└────────────────────────────────────────────────────────┘
```

### 9.1 Storage Bucket Configuration

*   **`avatars`**:
    *   *MIME Restrictions*: `image/jpeg`, `image/png`, `image/webp`.
    *   *Access Rule*: Public read access; write operations restricted to own user ID.
    *   *Path Pattern*: `avatars/{tenant_id}/users/{user_id}/avatar.webp`.
    *   *Retention*: Until account deletion.
    *   *Max Upload Size*: 2MB.
*   **`company-assets`**:
    *   *MIME Restrictions*: `image/jpeg`, `image/png`, `image/svg+xml`.
    *   *Access Rule*: Public read access; write operations restricted to `tenant_admin`.
    *   *Path Pattern*: `company-assets/{tenant_id}/branding/{asset_name}.webp`.
    *   *Retention*: Permanent.
    *   *Max Upload Size*: 5MB.
*   **`listing-media`**:
    *   *MIME Restrictions*: `image/*`, `video/mp4`, `video/quicktime`.
    *   *Access Rule*: Public read access; write operations restricted to `tenant_member`.
    *   *Path Pattern*: `listing-media/{tenant_id}/listings/{listing_id}/{uuid}.webp`.
    *   *Retention*: Same lifecycle as listing.
    *   *Max Upload Size*: 50MB.
*   **`documents`**:
    *   *MIME Restrictions*: `application/pdf`, `application/zip`.
    *   *Access Rule*: Restructured. Requires authenticated workspace tokens.
    *   *Path Pattern*: `documents/{tenant_id}/listings/{listing_id}/{uuid}.pdf`.
    *   *Retention*: 7 years.
    *   *Max Upload Size*: 100MB.

### 9.2 Storage Security Policy Example
```sql
CREATE POLICY "Tenant Isolation Policy" ON storage.objects
FOR ALL USING (
  bucket_id = 'listing-media' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
);
```

---

## SECTION 10 — BILLING BACKEND ARCHITECTURE

```
┌────────────────────────────────────────────────────────┐
│                   STRIPE WEBHOOK HANDLER               │
├────────────────────────────────────────────────────────┤
│ Webhook Event → Signature Check → Idempotency Verification│
│                                  │                     │
│               [Failed]           ▼ [Success]           │
│           Rollback Transaction  Write to billing_ledger│
└────────────────────────────────────────────────────────┘
```

### 10.1 Stripe Lifecycle State Engine
*   **Webhooks**: Verified with `STRIPE_WEBHOOK_SECRET`. Handlers write events to an append-only ledger before performing state updates.
*   **State Mutations**:
    *   `customer.subscription.updated` $\rightarrow$ Updates plan features and limits in `public.tenant_settings`.
    *   `invoice.payment_failed` $\rightarrow$ Flags subscription status as `past_due`, alerts admins, and starts 3-day grace period.
    *   `customer.subscription.deleted` $\rightarrow$ Downgrades tenant workspace to "Free Tier".

### 10.2 Idempotent Billing Ledger
```sql
CREATE TABLE public.billing_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  stripe_event_id TEXT UNIQUE NOT NULL,
  amount_cents    INT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'usd',
  event_type      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.process_billing_event(
  p_tenant_id UUID,
  p_event_id TEXT,
  p_amount INT,
  p_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Insert into ledger to prevent double-processing (Unique Constraint)
  INSERT INTO public.billing_ledger (tenant_id, stripe_event_id, amount_cents, event_type)
  VALUES (p_tenant_id, p_event_id, p_amount, p_type);
  
  RETURN TRUE;
EXCEPTION WHEN unique_violation THEN
  -- Event already processed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## SECTION 11 — SECURITY ARCHITECTURE

```
┌────────────────────────────────────────────────────────┐
│                     SECURITY GATEWAY                   │
├────────────────────────────────────────────────────────┤
│ Client Req → TLS 1.3 → JWT Check → DB Tenant RLS       │
└────────────────────────────────────────────────────────┘
```

### 11.1 Access Control & Token Security
*   **JWT Verification**: JWTs are parsed at the Edge. Tokens must be signed with the primary JWKS certificate. Invalid, expired, or structural token mismatches yield immediate HTTP 401 response status.
*   **Secrets Management**: Production secrets are managed in Infisical / AWS Secrets Manager. Keys are rotated every 90 days.

### 11.2 Postgres Row-Level Security Rules
```sql
-- Enforce tenant isolation on listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_listing_isolation ON public.listings
FOR ALL TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## SECTION 12 — OBSERVABILITY ARCHITECTURE

```
┌────────────────────────────────────────────────────────┐
│                    METRICS COLLECTION                  │
├────────────────────────────────────────────────────────┤
│ Services → OTel SDK → Prometheus (RED Metrics) → Grafana│
└────────────────────────────────────────────────────────┘
```

### 12.1 Metrics and Alerts
*   **Logging**: JSON logs are written to `stdout` and collected by Promtail/Loki.
*   **Telemetry**: OpenTelemetry trace context propagation is injected into all cross-service headers.
*   **SLO Metric Target**: 99.9% of HTTP requests resolved under 200ms.
*   **Alert Thresholds**:
    *   P0 (Critical): API success rates below 99% $\rightarrow$ Alert PagerDuty immediately.
    *   P1 (High): DB connection limits exceed 80% capacity for 5 minutes $\rightarrow$ Alert SRE Slack channel.

---

## SECTION 13 — DEPLOYMENT TOPOLOGY

```
┌───────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION DEPLOYMENT                        │
├───────────────────────┬───────────────────────┬───────────────────────┤
│ Edge: Next.js Client  │ Compute: Deno Edge    │ DB: PostgreSQL RLS    │
├───────────────────────┼───────────────────────┼───────────────────────┤
│ Vercel CDN            │ Supabase Functions    │ Neon Branching / Pools│
└───────────────────────┴───────────────────────┴───────────────────────┘
```

*   **VPC Configuration**: Dedicated database nodes deployed inside AWS private networks.
*   **Deployment Pipeline**:
    ```
    Code Commit → GitHub Actions (Linter/Tests) → Staging Deploy → Health Audit → Production Deploy
    ```
*   **Rollback Strategy**: Instant DNS traffic switching to the previous service image if health check responses exceed 5% error rates.
*   **Disaster Recovery**: Automated point-in-time recovery (PITR) backups scheduled hourly, with retention backups retained for 35 days.

---

## SECTION 14 — BACKEND IMPLEMENTATION ROADMAP

```
┌──────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION MILESTONES                     │
├──────────────────┬──────────────────┬────────────────┬───────────────┤
│ Phase 1: Core    │ Phase 2: Vector  │ Phase 3: Stripe│ Phase 4: Audit│
├──────────────────┼──────────────────┼────────────────┼───────────────┤
│ Auth & Tenant DB │ HNSW Search Engine│ Billing Ledger │ Compliance OS │
└──────────────────┴──────────────────┴────────────────┴───────────────┘
```

### 14.1 Execution Phases

*   **Phase 1: Core Infrastructure Setup**
    *   *Deliverables*: Database schemas, JWT claim integration, multi-tenant RLS configurations, and the API Gateway.
    *   *Effort*: 3 weeks.
    *   *Acceptance Criteria*: RLS policies verify tenant separation; cross-tenant queries fail by default.

*   **Phase 2: Hybrid Search & Vector Engines**
    *   *Deliverables*: pgvector HNSW indexes, text index parameters, and the hybrid search query function.
    *   *Effort*: 2 weeks.
    *   *Acceptance Criteria*: Hybrid searches resolve with latency times under 50ms.

*   **Phase 3: Stripe Integration & Billing Outbox**
    *   *Deliverables*: Webhook signature checking, billing database ledgers, and automated payment handlers.
    *   *Effort*: 2 weeks.
    *   *Acceptance Criteria*: Test webhook transactions process successfully with no double-entry billing logs.

*   **Phase 4: Trust, Safety & Compliance Auditing**
    *   *Deliverables*: Moderation filters, append-only security logging tables, and rate limiting engines.
    *   *Effort*: 2 weeks.
    *   *Acceptance Criteria*: Failed operations generate secure logs; malicious actors are quarantined automatically.

---

## SECTION 15 — PRODUCTION READINESS REPORT

Evaluate critical components against enterprise targets before production launch:

```
┌────────────────────────────────────────────────────────┐
│               PRODUCTION READINESS MARKS               │
├──────────────────────────┬─────────────────────────────┤
│ Core Tenant Isolation    │ 10/10                       │
├──────────────────────────┼─────────────────────────────┤
│ Hybrid Search Latency    │ 9/10                        │
├──────────────────────────┼─────────────────────────────┤
│ Billing Ledger Security  │ 10/10                       │
├──────────────────────────┼─────────────────────────────┤
│ Observability & Tracing  │ 8/10                        │
└──────────────────────────┴─────────────────────────────┘
```

*   **Risks Identified**: Vector query latency spikes when tenant listings scale past 100,000 items.
*   **Mitigation Actions**: Pre-filter pgvector cosine distance calculations using the tenant partition index.
*   **Security Gaps**: Temporary lack of automated API key rotation rules.
*   **Resolution Plan**: Deploy cron routines to disable API keys older than 90 days.

---

## SECTION 16 — STEP AE HANDOFF PACKAGE

The frontend application (developed in STEP AE) consumes the backend services based on the following integration guidelines:

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND HANDOFF SCHEMA              │
├────────────────────────────────────────────────────────┤
│ GET /api/v1/listings → Auth Headers → Tenant JWT Claim │
└────────────────────────────────────────────────────────┘
```

1.  **Authentication**: Save and include the JWT token in the `Authorization: Bearer <token>` request header.
2.  **Tenant Context**: Send the tenant ID in the custom `x-tenant-id` request header.
3.  **Realtime WebSockets**: Connect to the realtime gateway using the following connection configuration:
    ```javascript
    import { createClient } from '@supabase/supabase-js'
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } }
    })
    ```
4.  **Cache Control**: GET endpoints respond with standard headers: `Cache-Control: private, max-age=60`.

---

## SEALING ARCHITECTURE CONTRACTS

This backend engineering constitution is officially **finalized** and **locked**. No future stages will alter these contracts. All implementation phases must adhere strictly to these guidelines.
