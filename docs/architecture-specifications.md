# Platform Architecture Specifications (Phases 1 & 2)

This specification details the SQL definitions, schema configurations, and event contracts for Phase 1 (Identity & Isolation) and Phase 2 (Event Mesh & Realtime Streams) of the AI-Native Marketplace.

---

## 🏛️ Phase 1: Governance & Identity Foundation

### 1. Database Multi-Tenant RLS Policy DDL
To ensure secure data isolation, PostgreSQL Row-Level Security (RLS) is applied to all shared tenant tables.

```sql
-- 1. Enable Row-Level Security
ALTER TABLE tenant_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_analytics ENABLE ROW LEVEL SECURITY;

-- 2. Create Tenant Isolation Policies based on application role context
CREATE POLICY tenant_isolation_policy ON tenant_listings
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policy ON tenant_analytics
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 3. Super Admin Bypass Policy for Platform Auditing
CREATE POLICY super_admin_listing_policy ON tenant_listings
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'super_admin');
```

### 2. Multi-Tenant Auth Claims Claims Schema
JWT payloads injected by the gateway include user role details, tenancy access claims, and rate limit tiers.

```json
{
  "iss": "https://auth.platform.internal",
  "sub": "user_10284729104",
  "role": "tenant_operator",
  "tenant_context": {
    "tenant_id": "8c59f632-4217-48f8-b391-7667d8f4bc93",
    "tier": "enterprise",
    "allocated_tps": 100
  },
  "exp": 1780000000
}
```

---

## 🚀 Phase 2: Core Infrastructure & Event Mesh

### 1. Event Mesh Schema Definitions (JSON Schema Registry)
All asynchronous event exchanges must comply with structural JSON schemas validated before ingestion.

#### A. `listing_created.v1.json`
```json
{
  "$id": "https://schemas.platform.internal/marketplace/listing_created.v1.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string", "format": "uuid" },
    "listing_id": { "type": "string", "format": "uuid" },
    "payload": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "maxLength": 100 },
        "price": { "type": "number", "minimum": 0 },
        "embedding_vector": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 1536,
          "maxItems": 1536
        }
      },
      "required": ["title", "embedding_vector"]
    }
  },
  "required": ["event_id", "tenant_id", "listing_id", "payload"]
}
```

### 2. Realtime WebSocket Channel Topology
Client-side WebSockets interface with Supabase Realtime to stream data updates on specific topics.

```
WS Gateway Endpoint: wss://realtime.platform.internal/socket/websocket

Dynamic Subscriptions:
  1. Room: tenant_feed:<tenant_id>
     - Listens to: ranking_completed events.
  2. Room: tenant_moderation:<tenant_id>
     - Listens to: fraud_detected events.
```
