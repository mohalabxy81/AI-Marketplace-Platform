# SPEC 10 — REALTIME SPECIFICATION

> **Basis**: [PLANNER.md §12](file:///home/mohal665544/pr1/PLANNER.md) — Master Realtime Infrastructure
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Realtime Architecture Overview

The platform's realtime infrastructure transforms a traditional pull-based web experience into a **push-native, event-driven system**. Users never need to refresh to see updated feeds, moderation statuses, or billing alerts. All state changes propagate automatically through the WebSocket layer.

### 1.1 Technology Stack

| Layer | Technology | Rationale |
|:------|:----------|:---------|
| WebSocket Server | Supabase Realtime (Elixir/Phoenix) | Battle-tested; native PostgreSQL WAL integration |
| PostgreSQL WAL | Logical Replication with `pgoutput` | Zero-polling WAL streaming |
| Message Broker | Kafka → Realtime Consumer | For events originating outside PostgreSQL (AI results, billing alerts) |
| Connection State | Supabase connection pools | Isolated from API thread pool |
| Authentication | JWT validation on `CONNECT` | Tenant-scoped channel access |
| Backpressure | In-memory queue per connection | Protect slow client connections |

### 1.2 Realtime Event Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     REALTIME EVENT FLOW                                  │
│                                                                         │
│  [DB Mutation]                                                          │
│       │                                                                 │
│       ▼ (PostgreSQL WAL)                                                │
│  [Supabase Realtime WAL Listener]                                       │
│       │                                                                 │
│       ▼                                                                 │
│  [Channel Router]  ◄─── [Kafka Consumer] ◄─── [Event Mesh]             │
│       │            (For non-DB events:                                  │
│       │             ai.inference, billing, etc.)                        │
│       ▼                                                                 │
│  [Tenant Channel: tenant_feed:{tenant_id}]                              │
│  [Admin Channel: tenant_moderation:{tenant_id}]                         │
│  [Global Channel: platform:global]                                      │
│       │                                                                 │
│       ▼ (WebSocket Push)                                                │
│  [Connected Client Browser / Mobile App]                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Channel Topology

### 2.1 Channel Definitions

| Channel Pattern | Audience | Authentication | Purpose |
|:---------------|:---------|:--------------|:--------|
| `tenant_feed:{tenant_id}` | Tenant users | JWT (tenant member) | Feed updates, listing status changes, quota warnings |
| `tenant_moderation:{tenant_id}` | Tenant admins | JWT (admin/owner role) | Moderation queue updates, trust alerts |
| `user:{user_id}` | Individual user | JWT (own user_id) | Personal notifications: AI completions, mention alerts |
| `admin:platform` | Super Admins | JWT (super_admin role) | Global platform health, cross-tenant fraud alerts |
| `platform:global` | All connected users | JWT (any role) | Maintenance windows, feature announcements |
| `listing:{listing_id}` | Any user viewing listing | JWT | Real-time review count, status change (for detail pages) |

### 2.2 Channel Authorization Rules

| Channel | Join Condition | Rejection Action |
|:--------|:-------------|:----------------|
| `tenant_feed:{tenant_id}` | JWT `tenant_id` claim matches channel | HTTP 403 on join attempt |
| `tenant_moderation:{tenant_id}` | JWT `role` is `admin` or `owner` AND `tenant_id` matches | HTTP 403 |
| `user:{user_id}` | JWT `user_id` claim matches channel | HTTP 403 |
| `admin:platform` | JWT `role` is `super_admin` | HTTP 403 |
| `platform:global` | Any valid JWT | Allowed |
| `listing:{listing_id}` | Any valid JWT (listing must be `ACTIVE`) | HTTP 403 |

---

## 3. PostgreSQL WAL Integration

### 3.1 WAL Publication Configuration

```sql
-- Create publication for realtime-relevant tables
CREATE PUBLICATION platform_realtime_pub FOR TABLE
  marketplace.listings,
  marketplace.listing_statuses,
  trust_registry.moderation_queue,
  trust_registry.trust_scores,
  billing_ledger.usage_meters,
  billing_ledger.credit_balances,
  tenant_config.tenants,
  tenant_config.feature_flags;

-- Verify publication
SELECT * FROM pg_publication;
```

### 3.2 Table-to-Channel Mapping

| Table | WAL Operation | Target Channel | Event Name | Broadcast Condition |
|:------|:-------------|:--------------|:---------|:-------------------|
| `marketplace.listings` | INSERT | `tenant_feed:{tenant_id}` | `listing_new` | `status = 'ACTIVE'` |
| `marketplace.listings` | UPDATE | `tenant_feed:{tenant_id}` | `listing_updated` | Field change detected |
| `marketplace.listing_statuses` | INSERT | `tenant_feed:{tenant_id}` | `listing_status_changed` | Always |
| `marketplace.listing_statuses` | INSERT | `tenant_moderation:{tenant_id}` | `moderation_status_changed` | `new_status IN ('QUARANTINED','REJECTED','APPROVED')` |
| `trust_registry.moderation_queue` | INSERT | `admin:platform` | `moderation_item_queued` | `priority = 'URGENT'` |
| `trust_registry.moderation_queue` | UPDATE | `tenant_moderation:{tenant_id}` | `moderation_resolved` | `status = 'APPROVED' OR 'REJECTED'` |
| `trust_registry.trust_scores` | UPDATE | `tenant_feed:{tenant_id}` | `trust_score_updated` | `score_delta > 0.1 OR score < 0.3` |
| `billing_ledger.usage_meters` | UPDATE | `user:{user_id}` | `quota_warning` | `pct_consumed > 0.80` |
| `billing_ledger.credit_balances` | UPDATE | `tenant_feed:{tenant_id}` | `credit_balance_updated` | Always |
| `tenant_config.tenants` | UPDATE | `tenant_feed:{tenant_id}` | `tenant_status_changed` | `status` field changed |
| `tenant_config.feature_flags` | UPDATE | `tenant_feed:{tenant_id}` | `feature_flag_updated` | Always |

### 3.3 WAL Row Filter Application

Supabase Realtime applies row filters before broadcasting to prevent excessive noise:

```sql
-- Only broadcast listing changes to the owning tenant's channel
-- Filter: tenant_id = channel tenant_id

-- Example filter for marketplace.listings:
-- Broadcast to: tenant_feed:{NEW.tenant_id}
-- Condition: NEW.status = 'ACTIVE' OR OLD.status != NEW.status
```

---

## 4. Kafka-to-Realtime Consumer

For events that do NOT originate from PostgreSQL mutations (AI completions, billing events, fraud detections), a Kafka consumer bridges the Event Mesh to WebSocket channels.

### 4.1 Consumer Configuration

```
Consumer Group ID: realtime-gateway-consumer
Topics Subscribed:
  - monetization.quotas (quota_exceeded events)
  - ai.usage (budget_warning events)
  - trust.alerts (fraud_detected events)
  - discovery.rankings (ranking_completed for premium live-feed feature)
  - governance.audit (system maintenance events → platform:global)

Processing Model: Ordered per partition (no parallel consumer within same partition)
Consumer Lag Alert: If lag > 1,000 messages → alert
```

### 4.2 Kafka Event → Channel Routing Table

| Kafka Event | Target Channel | Broadcast Conditions | Payload Transform |
|:-----------|:--------------|:--------------------|:----------------|
| `monetization.quota_exceeded` | `tenant_feed:{tenant_id}` | Always | `{ resource, current_usage, limit, pct_used }` |
| `ai.budget_warning` | `user:{user_id}` (if user_id present) OR `tenant_feed` | Always | `{ resource, pct_consumed, estimated_depletion_hours }` |
| `trust.fraud_detected` | `admin:platform` | `risk_tier = CRITICAL OR HIGH` | Full fraud event payload |
| `trust.fraud_detected` | `tenant_moderation:{tenant_id}` | `risk_tier = MEDIUM OR HIGH` | Sanitized payload (no sensitive internals) |
| `discovery.ranking_completed` | `tenant_feed:{tenant_id}` | Premium plan only | `{ feed_id, top_5_ids, updated_at }` |
| `governance.config_changed` | `platform:global` | `is_maintenance_related = true` | `{ message, effective_at }` |

---

## 5. WebSocket Connection Lifecycle

### 5.1 Connection Establishment

```
Client → GET /socket/websocket?token={jwt}&vsn=2.0.0
       HTTP 101 Switching Protocols
       WebSocket connection established

Server validates JWT:
  - Signature verification (JWKS)
  - Expiry check
  - Extract: user_id, tenant_id, role

Server registers connection:
  - connection_id = UUID
  - tenant_id
  - user_id
  - connected_at
  - subscribed_channels = []

Connection stored in: Supabase Presence (in-memory, distributed across nodes)
```

### 5.2 Phoenix Channel Message Protocol

**Join Channel:**
```json
[topic, event, payload, ref]
["tenant_feed:acme-corp", "phx_join", {}, "ref-001"]

Server Reply (success):
["tenant_feed:acme-corp", "phx_reply", { "status": "ok", "response": {} }, "ref-001"]

Server Reply (error):
["tenant_feed:acme-corp", "phx_reply", { "status": "error", "response": {"reason": "unauthorized"} }, "ref-001"]
```

**Server Push to Client:**
```json
["tenant_feed:acme-corp", "listing_new", {
  "listing_id": "uuid",
  "title": "New AI Agent",
  "price": 49.99,
  "category_slug": "llm-agents",
  "timestamp": "2026-05-30T01:00:00Z"
}, null]
```

**Heartbeat (every 30 seconds):**
```json
["phoenix", "heartbeat", {}, "ref-heartbeat-1"]
Server reply: ["phoenix", "phx_reply", {"status": "ok"}, "ref-heartbeat-1"]
```

### 5.3 Connection Termination

| Reason | Action | Recovery |
|:-------|:-------|:--------|
| Normal client disconnect | Clean channel unsubscription | Client reconnects on demand |
| JWT expiry | Server closes with code 4001 (Unauthorized) | Client refreshes JWT, reconnects |
| Tenant suspended | Server closes with code 4003 (Forbidden) | No reconnection allowed |
| Server restart | Connection lost (code 1001) | Client auto-reconnects with exponential backoff |
| Backpressure limit hit | Oldest pending messages dropped, sync signal sent | Client performs REST poll to refresh state |

---

## 6. Backpressure & Quality of Service

### 6.1 Per-Connection Message Queue

Every WebSocket connection has an in-memory pending message queue.

| Parameter | Value | Description |
|:----------|:------|:------------|
| Queue size limit | 500 messages | Maximum pending messages before backpressure |
| Consumption lag tolerance | 5 seconds | Time allowed for client to catch up |
| Overflow action | Drop oldest messages, send `sync_required` event | Client must re-fetch via REST |

**Sync Required Event:**
```json
["tenant_feed:{tenant_id}", "sync_required", {
  "reason": "BACKPRESSURE_OVERFLOW",
  "sync_endpoints": {
    "listings": "/api/v1/listings?status=active",
    "feed": "/api/v1/feed"
  },
  "messages_dropped": 47
}, null]
```

### 6.2 Per-Tenant Connection Limits

| Plan Tier | Max Concurrent WebSocket Connections |
|:----------|:------------------------------------|
| `starter` | 10 |
| `growth` | 50 |
| `premium` | 500 |
| `enterprise` | 10,000 |

**When limit exceeded:** New connection attempts return HTTP 429. Oldest idle connection (last heartbeat > 5 min ago) is evicted to make room.

### 6.3 Message Deduplication

Each server-push message carries a monotonically increasing `sequence_id` per channel. Clients track the last received `sequence_id` and skip duplicates on reconnect.

```json
{
  "channel": "tenant_feed:acme-corp",
  "event": "listing_updated",
  "sequence_id": 10847,
  "payload": { ... }
}
```

---

## 7. Realtime Feed Updates (Premium Feature)

### 7.1 Live Discovery Feed Updates

For Premium/Enterprise tenants, when a new listing is indexed and scored, the Discovery Engine pushes live feed updates.

**Trigger:** `discovery.ranking_completed` event with `new_listing_promoted = true`.

**Server Push:**
```json
["tenant_feed:{tenant_id}", "feed_item_promoted", {
  "listing_id": "UUID",
  "new_position": 3,
  "previous_position": null,
  "score": 0.891,
  "listing_summary": {
    "title": "Zendesk Auto-Reply Agent v2",
    "price": 79.99,
    "category": "customer-support",
    "company": "BotForge"
  },
  "timestamp": "ISO-8601 UTC"
}, null]
```

### 7.2 Real-Time Personalization Updates

When the Intelligence Domain completes a fast-loop preference vector update:

```json
["user:{user_id}", "preference_updated", {
  "updated_at": "ISO-8601 UTC",
  "interaction_count": 47,
  "top_category_affinities": [
    { "category": "llm-agents", "affinity": 0.87 },
    { "category": "data-tools", "affinity": 0.61 }
  ],
  "feed_refresh_recommended": true
}, null]
```

---

## 8. Realtime Moderation (Trust & Safety)

### 8.1 Content Quarantine Alert

When a listing is quarantined, the listing owner receives an immediate notification:

```json
["user:{listing_owner_user_id}", "content_quarantined", {
  "listing_id": "UUID",
  "listing_title": "string",
  "quarantine_reason": "POLICY_VIOLATION",
  "estimated_review_hours": 4,
  "appeal_url": "/dashboard/listings/{listing_id}/appeal"
}, null]
```

**Admin alert (parallel):**
```json
["admin:platform", "urgent_moderation_required", {
  "queue_id": "UUID",
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "risk_score": 0.94,
  "categories": ["TOXICITY", "SPAM"],
  "review_url": "/admin/moderation/{queue_id}"
}, null]
```

### 8.2 Content Approval Notification

```json
["user:{listing_owner_user_id}", "content_approved", {
  "listing_id": "UUID",
  "listing_title": "string",
  "approved_at": "ISO-8601 UTC",
  "listing_url": "/marketplace/{listing_slug}"
}, null]
```

---

## 9. Realtime Analytics Push

### 9.1 Live Impression Counter

For listing detail pages, live impression counts are pushed every 60 seconds:

```json
["listing:{listing_id}", "impression_update", {
  "listing_id": "UUID",
  "impressions_1h": 847,
  "clicks_1h": 23,
  "ctr_1h": 0.027,
  "updated_at": "ISO-8601 UTC"
}, null]
```

### 9.2 Real-Time Quota Dashboard

```json
["tenant_feed:{tenant_id}", "quota_update", {
  "billing_period": "2026-05",
  "resources": {
    "ai_tokens": { "used": 423847, "limit": 500000, "pct_used": 84.8 },
    "listings": { "used": 47, "limit": 100, "pct_used": 47.0 }
  },
  "estimated_depletion_date": "2026-05-28",
  "upgrade_url": "/billing/upgrade"
}, null]
```

---

## 10. Latency Targets & SLOs

| Message Type | Source-to-Client Latency Target | P99 Ceiling |
|:------------|:-------------------------------|:-----------|
| WAL → Channel push (DB mutations) | <100ms | <500ms |
| Kafka → Channel push (billing/trust events) | <200ms | <1,000ms |
| Feed update (discovery ranking) | <150ms | <750ms |
| Quota warning | <500ms | <2,000ms |
| Heartbeat acknowledgment | <50ms | <200ms |

**SLO Monitoring:**
- Supabase Realtime latency measured as time from WAL record creation timestamp to client delivery confirmation.
- Latency tracked per channel type and tenant tier.
- Alert: If WAL → delivery P99 > 500ms for 5 consecutive minutes.

---

## 11. Failure Handling

### 11.1 Supabase Realtime Node Failure

- Supabase Realtime runs as a clustered Elixir application (multiple nodes).
- On node failure: clients on that node disconnect with code 1001.
- Client reconnect logic: exponential backoff starting at 1s, max 30s, jitter 20%.
- After reconnect: client re-subscribes to all channels. Server sends `presence_state` with current state.
- Missed messages during downtime: client performs REST poll on reconnect to sync state.

### 11.2 WAL Replication Slot Lag

- If WAL replication slot falls significantly behind (>10,000 uncommitted changes): alert fires.
- Mitigation: Increase WAL consumer throughput, or temporarily queue non-critical WAL changes.
- Emergency: If slot lag unrecoverable, drop and recreate slot (loss of some realtime updates; client refreshes via REST).

### 11.3 Kafka Consumer Lag

- Realtime Kafka consumer lag monitored per topic partition.
- Alert threshold: consumer lag > 1,000 messages.
- If lag > 5,000 messages: temporarily pause non-critical topics (analytics, preference updates).
- Always process: quota alerts, fraud alerts (high priority, never paused).

---

## 12. Realtime Infrastructure Observability

### 12.1 Metrics

| Metric | Type | Description | Alert Threshold |
|:-------|:-----|:------------|:---------------|
| `realtime_active_connections` | Gauge | Current WebSocket connections | Alert if approaches plan limits |
| `realtime_message_delivery_latency_ms` | Histogram | WAL → client delivery time | P99 > 500ms |
| `realtime_backpressure_events_total` | Counter | Backpressure overflow events | Alert if > 10/min per tenant |
| `realtime_kafka_consumer_lag` | Gauge | Kafka consumer lag by topic | Alert if > 1,000 |
| `realtime_connection_errors_total` | Counter | Failed connection attempts | Alert if > 1% of attempts |
| `realtime_channel_join_rate` | Counter | Channel joins per second | Capacity planning |
| `realtime_message_drop_rate` | Counter | Messages dropped due to backpressure | Alert if > 0.1% |

### 12.2 Scaling Strategy

**Phase 1–4:** Single Supabase Realtime cluster, shared with all tenants.

**Phase 5–6 (>10,000 concurrent connections):**
- Deploy dedicated Supabase Realtime nodes per region.
- Sticky session routing: same user always connects to same node (reduces state sync complexity).
- Shared Redis Pub/Sub for cross-node channel broadcasting.

**Phase 7–9 (>100,000 concurrent connections):**
- Multi-region Supabase Realtime deployment.
- Users connect to nearest regional node.
- Cross-region message synchronization via Kafka (regional topics with global replication).
