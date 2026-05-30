# 10. EVENT PROCESSING ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, Platform Architects
> **Domain**: Event Driven Evolution

## 1. Executive Summary
The Event Processing Architecture ensures eventual consistency across the Hybrid Modular Monolith. Because direct cross-schema database writes are prohibited to maintain boundaries, changes must be broadcast as events. We utilize the **Transactional Outbox Pattern** to guarantee reliable event publishing.

## 2. Event Store (The Outbox)
A dedicated table inside Postgres acts as the staging ground for all events.

```sql
CREATE TABLE public.outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);
```

## 3. The Outbox Flow (Producer)
When a service alters state (e.g., creating a listing), it opens a database transaction:
1. `INSERT INTO marketplace.listings (...)`
2. `INSERT INTO public.outbox (event_type, payload) VALUES ('listing.created', {...})`
3. `COMMIT;`

If the transaction fails, the event is rolled back. This guarantees no phantom events.

## 4. The Relay (Consumer)
An external worker (or Cron-triggered Edge Function) continuously polls the `outbox` table where `processed_at IS NULL`.
1. It reads a batch of events.
2. It publishes them to the actual Event Broker (Kafka or Redis Streams).
3. It marks the events in the `outbox` as `processed_at = now()`.

## 5. Event Ownership Matrix

| Event Type | Producer Domain | Consumer Domains | Purpose |
| :--- | :--- | :--- | :--- |
| `tenant.provisioned` | Tenant | Billing, Auth, Discovery | Sets up necessary isolated structures. |
| `listing.created` | Marketplace | Trust, AI Ops, Search | Triggers moderation and embedding generation. |
| `listing.published` | Trust (Moderation) | Search, Discovery | Makes listing visible to retrieval engines. |
| `lead.submitted` | Marketplace | CRM, Notifications, Analytics | Triggers chat thread, emails, and conversion stats. |
| `billing.quota_exceeded` | Billing | Marketplace, Tenant | Archives excess listings; locks API access. |

## 6. Dead Letter Handling
If an event consumer fails to process a message (e.g., AI provider 500 error during embedding generation), the consumer must retry with exponential backoff. After 5 failures, the message is routed to a Dead Letter Queue (DLQ) in Kafka/Redis for manual inspection.

## 7. Replay Strategy
In the event of a catastrophic failure or introducing a new consumer service (e.g., a new recommendation engine), we can replay events.
- **Short-term Replay**: Read directly from the `outbox` table by resetting the `processed_at` timestamp.
- **Long-term Replay**: Stream from the Kafka retention log.
