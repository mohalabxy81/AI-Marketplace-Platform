# 12. BILLING INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: Financial Engineers, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Monetization Paradigm

The platform supports a complex hybrid monetization model due to its AI-Native B2B2C nature:
1. **Tenant Subscriptions**: Flat SaaS fee charged to the marketplace operator (e.g., $99/mo).
2. **Usage-Based Billing**: Variable fees charged to the tenant for platform resources (AI Tokens, Vector Storage).
3. **Marketplace Take Rates (Commissions)**: A percentage cut taken when a buyer purchases a listing from a seller within a tenant's marketplace.

To manage this without data corruption, we utilize an **Immutable Event-Sourced Ledger** within Postgres.

---

## 2. Ledger Architecture

### 2.1 The `monetization.ledger_events` Table
This is the absolute source of financial truth. It is an append-only table. **No UPDATE or DELETE statements are permitted.**

```sql
CREATE TABLE monetization.ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    user_id UUID REFERENCES identity.user_profiles(id),  -- Optional (if buyer transaction)
    event_type TEXT NOT NULL,                 -- 'subscription_charge', 'token_usage', 'commission'
    amount DECIMAL(12,4) NOT NULL,            -- Exact precision. Negative = Credit/Payment
    currency TEXT DEFAULT 'USD',
    resource_id TEXT,                         -- e.g., 'stripe_invoice_id' or 'listing_id'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Calculating Balances
A tenant's current balance is never stored as a static number that can drift. It is calculated dynamically via an indexed View or RPC call.

```sql
CREATE OR REPLACE VIEW monetization.tenant_balances AS
SELECT 
  tenant_id, 
  currency, 
  SUM(amount) as current_balance 
FROM monetization.ledger_events 
GROUP BY tenant_id, currency;
```

---

## 3. Stripe Integration Architecture

Stripe serves as the external payment processor, but Supabase remains the system of record for entitlements.

### 3.1 Synchronizing State
1. **Customer Creation**: When a new tenant is created in `platform.tenants`, an Edge Function asynchronously creates a Stripe Customer and saves the `stripe_customer_id` into `platform.subscriptions`.
2. **Checkout**: Next.js redirects to Stripe Checkout.
3. **Webhook Ingestion**: Stripe sends a webhook. A Supabase Edge Function (`stripe-webhook`) verifies the signature, bypasses RLS (Service Role), and processes the event.

### 3.2 Idempotency
Stripe Webhooks can be delivered multiple times. The Edge Function must ensure idempotency.
```typescript
// Inside Edge Function
const isProcessed = await supabase
  .from('ledger_events')
  .select('id')
  .eq('resource_id', stripeEvent.id)
  .single();

if (isProcessed.data) return new Response('Already processed', { status: 200 });
```

---

## 4. AI Token Metering & Quotas

Because AI Inference occurs at high velocity, we cannot write a ledger event for every single LLM call.

### 4.1 The Token Guard Strategy
1. **Cache**: The tenant's current monthly token allowance and current usage are cached in Redis (or a high-speed Supabase unlogged table).
2. **Pre-check**: Before the AI Edge Function calls OpenAI, it checks the fast cache. If usage > allowance, it blocks the request.
3. **Accumulation**: The Edge Function increments the cache counter.
4. **Flushing**: A scheduled pg_cron job runs every 5 minutes, reads the cache deltas, and inserts aggregated `token_usage` events into `monetization.ledger_events` for permanent storage, resetting the delta cache.

---

## 5. RLS and Security

Financial data is the highest-risk target in the database.

```sql
ALTER TABLE monetization.ledger_events ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own ledger, but CANNOT write or modify it.
CREATE POLICY "tenant_read_ledger" ON monetization.ledger_events
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id());

-- Writes are restricted entirely to the service_role (Edge Functions).
-- Thus, no INSERT/UPDATE/DELETE policies are created for the authenticated role.
```
