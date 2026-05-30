# 11. EVENT ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, Systems Architects
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. The Event Mesh Philosophy

The platform operates as a set of bounded contexts (schemas). To maintain **Strict Eventual Consistency** without the overhead of distributed two-phase commits, the database acts as the single source of truth for both state changes and the events those changes produce.

### 1.1 The Transactional Outbox Pattern
We do not trigger external APIs (like Stripe, OpenAI, or Kafka) synchronously during an HTTP request.
1. The Next.js API calls Supabase to `INSERT INTO marketplace.listings`.
2. A PostgreSQL Trigger (or explicit RPC call) fires and simultaneously `INSERT INTO outbox.events ('listing_created', payload)`.
3. The transaction commits. Both the listing and the event are guaranteed to be saved.
4. A background processor reads `outbox.events` and distributes the event.

---

## 2. Event Payload Standard

All events in the outbox MUST adhere to a strict JSON Schema envelope.

```json
{
  "event_id": "019485ab-3b7d-7abc-9bdd-2b0d7b3dcb6d",
  "event_type": "marketplace.listing_created",
  "schema_version": 1,
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:00.000Z",
  "correlation_id": "corr_3b7d-4bad-9bdd-trace",
  "payload": {
    "listing_id": "UUID",
    "title": "AI Writing Agent",
    "price": 29.99
  }
}
```

---

## 3. Event Processing Lifecycle

### 3.1 The Outbox Table Definition
```sql
CREATE TABLE outbox.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'processed', 'failed'
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
-- Index to optimize the polling query
CREATE INDEX idx_outbox_pending ON outbox.events(created_at) WHERE status = 'pending';
```

### 3.2 The Processing Mechanism (Supabase Webhooks vs Polling)

**Approach A: Supabase Database Webhooks (Low Latency, Low Volume)**
For low-volume, high-priority events (like triggering a welcome email on `user_registered`), Supabase Webhooks are configured to fire a POST request to an Edge Function immediately upon row insertion.

**Approach B: Edge Function Polling (High Volume, Batching)**
For high-volume events (like analytics telemetry or bulk listing imports), firing a webhook per row crashes the Edge Function. Instead, a cron-triggered Edge Function wakes up every 10 seconds, selects `LIMIT 1000 FOR UPDATE SKIP LOCKED` from `outbox.events`, processes them in batch, and updates status to `processed`.

### 3.3 Dead Letter Queue (DLQ)
If an event fails processing (e.g., OpenAI API is down):
1. `retry_count` is incremented.
2. `status` remains `pending` with an exponential backoff delay.
3. After 5 retries, `status` changes to `failed`.
4. Failed events trigger an alert in the `trust.alerts` table for manual administrator intervention.

---

## 4. Key Event Flows

### 4.1 Listing Creation Pipeline
When a user creates a new listing, it touches multiple domains asynchronously:
1. `marketplace.listing_created` is inserted into outbox.
2. **AI Processor**: Reads event, generates vector embedding, saves to `ai.embeddings`.
3. **Trust Processor**: Reads event, scans payload for toxicity/PII. If flagged, inserts into `trust.moderation_queue`.
4. **Search Processor**: Reads event, updates `discovery.feed_cache` if the item matches active user preferences.

### 4.2 Billing Pipeline
1. Stripe webhook triggers Edge Function.
2. Edge function updates `monetization.ledger_events`.
3. Edge function inserts `monetization.invoice_paid` into outbox.
4. **Tenant Processor**: Reads event, updates `platform.tenants.status` from 'suspended' back to 'active'.
5. **Notification Processor**: Reads event, sends confirmation email.
