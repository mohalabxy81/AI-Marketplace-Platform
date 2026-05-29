# SPEC 12 — MONETIZATION SPECIFICATION

> **Basis**: [PLANNER.md §9](file:///home/mohal665544/pr1/PLANNER.md) — Master Monetization Operating Model
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Monetization Architecture Overview

The platform's monetization system is built as a **triple-revenue-stream infrastructure**: subscription fees, AI-metered usage, and promoted discovery auctions. It is architected with the same principles as Stripe's billing infrastructure: immutable ledger, double-entry accounting, idempotent events, and external payment provider synchronization.

### 1.1 Revenue Streams

| Stream | Mechanism | Billing Model | Share of ARR (Target) |
|:-------|:---------|:-------------|:---------------------|
| SaaS Subscriptions | Monthly/Annual plan fees | Flat-rate recurring | 40% |
| AI Token Usage | Per-token metered billing | Usage-based (overages + credits) | 35% |
| Promoted Discovery | CPC/CPM auction | Performance-based | 15% |
| Marketplace Commissions | % of listing transactions | Transaction fee | 10% |

---

## 2. Subscription Plan Specification

### 2.1 Plan Tier Definitions

| Plan | Monthly Price | Annual Price (20% discount) | Target Segment |
|:-----|:-------------|:--------------------------|:--------------|
| `free` | $0 | N/A | Individual developers, exploration |
| `starter` | $49/mo | $470/yr | Solo founders, small teams |
| `growth` | $199/mo | $1,910/yr | Growing companies (5–50 employees) |
| `premium` | $799/mo | $7,670/yr | Established companies (50–500 employees) |
| `enterprise` | Custom | Custom | Large organizations, platform partners |

### 2.2 Plan Feature Matrix

| Feature | Free | Starter | Growth | Premium | Enterprise |
|:--------|:-----|:--------|:-------|:--------|:-----------|
| AI Tokens (monthly) | 10,000 | 500,000 | 5,000,000 | 50,000,000 | Unlimited |
| Active Listings | 3 | 25 | 100 | 500 | Unlimited |
| Seats (team members) | 1 | 5 | 25 | 100 | Unlimited |
| Storage | 1 GB | 10 GB | 100 GB | 1 TB | Custom |
| API Calls/month | 1,000 | 50,000 | 500,000 | 5,000,000 | Unlimited |
| WebSocket Connections | 5 | 50 | 500 | 5,000 | Custom |
| AI Models Available | GPT-4o-mini only | GPT-4o-mini, Claude Haiku | All models | All models + priority | All + custom fine-tuned |
| Promoted Discovery | ✗ | ✓ (basic) | ✓ | ✓ (priority placement) | ✓ (guaranteed slots) |
| Custom Domain | ✗ | ✓ | ✓ | ✓ | ✓ |
| SSO/SAML | ✗ | ✗ | ✓ | ✓ | ✓ |
| Audit Logs | ✗ | 30 days | 90 days | 1 year | 7 years |
| SLA | Best effort | 99.5% | 99.9% | 99.95% | 99.99% |
| Support | Community | Email | Priority Email | Dedicated CSM | Dedicated TAM + SLA |
| White-label | ✗ | ✗ | ✗ | ✓ | ✓ |

### 2.3 Plan Transition Rules

| Transition | Proration | Effective Date | Credit Application |
|:-----------|:---------|:--------------|:------------------|
| Upgrade (same day) | Prorate remaining days of old plan | Immediate | Credit to next invoice |
| Upgrade (at renewal) | No proration | Next billing date | N/A |
| Downgrade | No refund; new limits effective immediately | Next billing date | N/A |
| Cancellation | No refund; access continues until period end | End of billing period | N/A |

---

## 3. Usage Metering Pipeline

### 3.1 Metered Resources

| Resource Type | Measurement Unit | Cost (Starter) | Cost (Growth) | Cost (Premium/Enterprise) |
|:-------------|:----------------|:--------------|:-------------|:--------------------------|
| AI Input Tokens | Per 1,000 tokens | Included up to plan limit, then $0.003/1K | $0.0025/1K overage | $0.002/1K overage |
| AI Output Tokens | Per 1,000 tokens | $0.012/1K overage | $0.010/1K overage | $0.008/1K overage |
| Storage Overage | Per GB/month | $0.50/GB | $0.30/GB | $0.20/GB |
| API Calls Overage | Per 10,000 calls | $1.00 | $0.75 | $0.50 |
| Additional Seats | Per seat/month | $9/seat | $7/seat | $5/seat |

### 3.2 Metering Architecture

**Real-Time Metering (Usage Meters):**
- Each resource has a meter counter in `billing_ledger.usage_meters`.
- Meter updates via Redis atomic increment (Lua script) for high-throughput updates.
- PostgreSQL `usage_meters` row is synced from Redis every 60 seconds (for durability).
- Meter is the **source of truth for quota enforcement** (read from Redis for performance).

**Usage Event Flow:**
```
[AI Inference Completes]
       │
       ▼
[ai.inference_completed event emitted to Kafka]
       │
       ▼
[Monetization Consumer receives event]
       │
  ┌────┴────────────────────┐
  ▼                         ▼
[Redis INCR                 [Write to outbox_events:
 usage_meter counter]        monetization.event_recorded]
       │
       ▼ (every 60 seconds)
[Sync Redis counter →
 billing_ledger.usage_meters]
```

### 3.3 Usage Meters Table: `billing_ledger.usage_meters`

| Column | Type | Description |
|:-------|:-----|:------------|
| `meter_id` | UUID | PRIMARY KEY |
| `tenant_id` | UUID | NOT NULL UNIQUE per resource_type |
| `resource_type` | VARCHAR(50) | `AI_INPUT_TOKENS`, `AI_OUTPUT_TOKENS`, `STORAGE_GB`, `API_CALLS`, `SEATS` |
| `billing_period_start` | DATE | First day of current billing period |
| `billing_period_end` | DATE | Last day of current billing period |
| `plan_included_amount` | DECIMAL | Amount included in plan without overage |
| `current_usage` | DECIMAL | Current period usage |
| `overage_amount` | DECIMAL | `max(0, current_usage - plan_included_amount)` |
| `last_updated_at` | TIMESTAMPTZ | |

---

## 4. Billing Ledger Architecture

### 4.1 Ledger Design Principles

The billing ledger is an **immutable, append-only financial record**. It follows double-entry accounting principles:

- **Credits** (money coming in): Subscription payments, credit purchases, proration credits.
- **Debits** (charges): Plan fees, AI usage overages, storage overages.
- **Adjustments**: Refunds, manual credits — always recorded as NEW entries (never modify existing).

### 4.2 Ledger Entry Schema: `billing_ledger.ledger_entries`

| Column | Type | Constraints | Description |
|:-------|:-----|:-----------|:------------|
| `ledger_id` | UUID | PRIMARY KEY | |
| `tenant_id` | UUID | NOT NULL | |
| `entry_type` | VARCHAR(50) | NOT NULL | `SUBSCRIPTION_FEE`, `AI_USAGE_DEBIT`, `STORAGE_DEBIT`, `CREDIT_PURCHASE`, `REFUND`, `PRORATION_CREDIT`, `PROMOTIONAL_CREDIT`, `MARKETPLACE_COMMISSION` |
| `amount` | DECIMAL(12,4) | NOT NULL | Positive = credit, Negative = debit |
| `currency` | VARCHAR(3) | NOT NULL DEFAULT 'USD' | |
| `description` | TEXT | NOT NULL | Human-readable line item description |
| `billing_period` | VARCHAR(7) | NOT NULL | `YYYY-MM` format |
| `source_event_id` | UUID | NULL | Causation event from Event Mesh |
| `source_event_type` | VARCHAR(200) | NULL | |
| `stripe_charge_id` | VARCHAR(100) | NULL | Stripe charge reference |
| `invoice_id` | UUID | NULL | FK → invoices |
| `metadata` | JSONB | NULL | Additional context |
| `created_at` | TIMESTAMPTZ | NOT NULL | Append-only timestamp |

**IMMUTABILITY ENFORCEMENT:**
```sql
-- Revoke UPDATE and DELETE on ledger_entries for all service roles
REVOKE UPDATE, DELETE ON billing_ledger.ledger_entries FROM ALL;
GRANT INSERT, SELECT ON billing_ledger.ledger_entries TO platform_service_billing;
```

### 4.3 Credit Balance System

The credit balance is computed from the ledger (not stored directly):
```sql
SELECT
  tenant_id,
  SUM(amount) AS credit_balance_usd
FROM billing_ledger.ledger_entries
WHERE tenant_id = :tenant_id
  AND entry_type IN ('CREDIT_PURCHASE', 'PROMOTIONAL_CREDIT', 'PRORATION_CREDIT', 'REFUND', 'SUBSCRIPTION_FEE_COVERED_BY_CREDIT')
GROUP BY tenant_id;
```

For performance, a **materialized balance** is maintained in `billing_ledger.credit_balances` and updated after each ledger entry.

---

## 5. Invoice Generation

### 5.1 Invoice Generation Trigger

- **Subscription invoices:** Generated on the billing period renewal date (monthly or annual).
- **Usage-based invoices:** Rolled into the monthly subscription invoice as additional line items.
- **On-demand invoices:** Triggered by credit purchases or one-time fees.

### 5.2 Invoice Structure

```
Invoice for Acme Corp — May 2026

Plan: Growth ($199.00/month)
  Subscription Fee: $199.00
  
Usage Overages:
  AI Input Tokens: 1,250,000 over 5,000,000 limit
    = 1,250 × $0.0025/1K = $3.13
  AI Output Tokens: 430,000 over included
    = 430 × $0.010/1K = $4.30
  Storage: 15 GB over 100 GB limit
    = 15 × $0.30 = $4.50
    
Promotions:
  Referral Credit Applied: -$20.00

Subtotal: $191.43 - $20.00 = $171.43
Tax (EST): $12.00
Total: $183.43
```

### 5.3 Stripe Synchronization

**Stripe Webhook Processing (idempotent):**
```
Stripe Event: invoice.payment_succeeded
  → Check stripe_sync_log for event_id (deduplication)
  → Update billing_ledger.invoices.status = 'PAID'
  → Insert ledger_entry: type=SUBSCRIPTION_FEE, amount=negative (debit)
  → Emit monetization.payment_received event
  → Send payment confirmation email via notification service
```

---

## 6. Promoted Discovery Auction Engine

### 6.1 Auction Architecture

The promoted discovery system uses a **Generalized Second-Price (GSP) auction** for fair pricing and honest bidding incentives.

**Key Properties:**
- Winner pays the minimum amount needed to maintain their position (runner-up bid + $0.01).
- This eliminates overbidding — rational bidders bid their true value.
- Multi-slot auction: top 3 positions can be sponsored.

### 6.2 Auction Execution

**When auction runs:** For every feed generation request containing eligible sponsored candidates.

**Eligibility:** Campaign must be:
- Status `ACTIVE` with positive daily budget remaining.
- Keyword/category matches the current feed context.
- Listing must have `trust_score >= 0.50`.

**GSP Price Calculation:**
```
Given bids sorted: B1 ≥ B2 ≥ B3 ≥ ... ≥ Bn

Position 1 winner (B1) pays: B2 + $0.01
Position 2 winner (B2) pays: B3 + $0.01
Position 3 winner (B3) pays: B4 + $0.01

If fewer than K+1 eligible bidders for position K:
  Winner pays minimum bid floor ($0.01)
```

**Bid Auction Execution Speed:** Entire auction must complete in <2ms (in-memory, pre-loaded bid cache).

### 6.3 Campaign Configuration Schema: `billing_ledger.ad_campaigns`

| Column | Type | Description |
|:-------|:-----|:------------|
| `campaign_id` | UUID | PRIMARY KEY |
| `tenant_id` | UUID | |
| `name` | VARCHAR(200) | |
| `listing_ids` | UUID[] | Promoted listings |
| `bid_type` | VARCHAR(10) | `CPC` (cost-per-click) or `CPM` (cost-per-thousand-impressions) |
| `bid_amount` | DECIMAL(10,4) | Max bid in USD |
| `daily_budget_usd` | DECIMAL(10,2) | Daily spending cap |
| `total_budget_usd` | DECIMAL(10,2) | NULL = no total cap |
| `targeting_keywords` | VARCHAR[] | NULL = all queries |
| `targeting_category_ids` | UUID[] | NULL = all categories |
| `spent_today_usd` | DECIMAL(10,4) | Reset daily at 00:00 UTC |
| `total_spent_usd` | DECIMAL(10,4) | Lifetime spend |
| `impressions_total` | BIGINT | |
| `clicks_total` | BIGINT | |
| `status` | VARCHAR(20) | `ACTIVE`, `PAUSED`, `BUDGET_EXHAUSTED`, `ENDED` |
| `start_date` | DATE | |
| `end_date` | DATE | NULL = runs indefinitely |

### 6.4 Ad Billing Events

**CPC Billing (per click):**
1. User clicks sponsored listing (`discovery.item_clicked` with `is_sponsored = true`).
2. Monetization Consumer processes click event.
3. Look up winning campaign for this listing/feed.
4. Charge campaign daily budget: Redis `DECR campaign:{campaign_id}:daily_remaining` by charged_cpc.
5. Create ledger entry: `entry_type = 'AD_CPC_CHARGE'`.
6. Emit `monetization.ad_auction_completed` event.

**Daily Budget Reset:** Cron job at 00:00 UTC resets `spent_today_usd` and Redis counters for all active campaigns.

**Budget Exhaustion:** When `spent_today_usd >= daily_budget_usd`, campaign status auto-updated to `BUDGET_EXHAUSTED` for the day.

---

## 7. Promotional Credits & Coupons

### 7.1 Credit Types

| Credit Type | Source | Expiry | Transferable |
|:-----------|:-------|:-------|:-----------|
| `REFERRAL_CREDIT` | Referral program | 12 months | No |
| `PROMOTIONAL_CREDIT` | Marketing campaigns | 90 days | No |
| `SUPPORT_CREDIT` | Customer support compensation | 6 months | No |
| `PRORATION_CREDIT` | Plan downgrade proration | Next invoice cycle | No |
| `PURCHASED_CREDIT` | Direct credit purchase | 24 months | No |

### 7.2 Coupon Schema

```
billing_ledger.coupons:
  coupon_id: UUID
  code: VARCHAR(50) UNIQUE
  discount_type: PERCENTAGE | FIXED_AMOUNT | FREE_MONTHS
  discount_value: DECIMAL
  applicable_plans: VARCHAR[] (NULL = all plans)
  max_redemptions: INTEGER (NULL = unlimited)
  redemption_count: INTEGER
  valid_from: DATE
  valid_until: DATE | NULL
  created_by_admin_id: UUID
  is_active: BOOLEAN
```

---

## 8. Revenue Attribution Model

### 8.1 Attribution Dimensions

| Dimension | Purpose |
|:----------|:--------|
| Tenant ID | Per-tenant revenue tracking |
| Plan Tier | Revenue by segment |
| Revenue Type | Subscription vs. AI usage vs. ads |
| Acquisition Channel | Referral, organic, paid, partnership |
| Cohort Month | Monthly cohort revenue tracking |
| Geographic Region | Revenue by country/region |

### 8.2 Tenant Profitability Model

For each tenant, track:
```
tenant_gross_revenue = subscription_fees + ai_overage_fees + ad_spend
tenant_direct_costs = ai_inference_cost + storage_cost + support_cost
tenant_gross_margin = tenant_gross_revenue - tenant_direct_costs
tenant_gross_margin_pct = tenant_gross_margin / tenant_gross_revenue
```

**AI Cost Tracking:**
- Every inference call has a `cost_usd` logged in `ai_cache.token_usage_log`.
- Actual cost = provider's cost to platform (at wholesale rates).
- Charged to tenant at retail markup (1.3x–2.0x based on plan).

### 8.3 MRR Calculation

```sql
-- Current MRR from active subscriptions
SELECT
  SUM(CASE
    WHEN billing_cycle = 'ANNUAL' THEN annual_price / 12
    ELSE monthly_price
  END) AS mrr_usd
FROM billing_ledger.subscriptions s
JOIN billing_ledger.plan_definitions p ON p.plan_id = s.plan_id
WHERE s.status = 'ACTIVE';
```

---

## 9. Monetization Events Catalog

| Event | Kafka Topic | Trigger | Key Consumers |
|:------|:-----------|:--------|:-------------|
| `monetization.quota_exceeded` | `monetization.quotas` | Usage hits plan limit | AI Gateway (block), Realtime (notify user) |
| `monetization.event_recorded` | `monetization.billing` | Usage event processed | Analytics, Ledger worker |
| `monetization.subscription_changed` | `monetization.billing` | Plan up/downgrade | Tenant (update limits), Feature flags |
| `monetization.invoice_generated` | `monetization.billing` | Billing cycle renewal | Notification service (email), Stripe sync |
| `monetization.payment_received` | `monetization.billing` | Stripe payment success | Ledger worker, Notification, Analytics |
| `monetization.payment_failed` | `monetization.billing` | Stripe payment failure | Notification, Retry workflow |
| `monetization.ad_auction_completed` | `monetization.ads` | Auction resolved | Analytics, Ledger (CPC charge) |
| `monetization.credit_low` | `monetization.quotas` | Credits < 10% remaining | Realtime (user notification), Notification service |

---

## 10. Compliance & Financial Controls

### 10.1 Audit Requirements

| Data Type | Retention | Access | Purpose |
|:----------|:---------|:-------|:--------|
| `ledger_entries` | 7 years | Read-only (audit role) | Financial audit compliance |
| `invoices` | 7 years | Read (admin + tenant) | Tax and accounting records |
| `stripe_sync_log` | 3 years | Read (admin) | Payment reconciliation |
| `ad_impressions` | 1 year | Read (tenant) | Ad spend validation |

### 10.2 Stripe Integration Security

- Stripe webhooks validated via `HMAC-SHA256` signature verification (`Stripe-Signature` header).
- Stripe secret key stored in Vault/Secret Manager (never in environment variables or database).
- Payment method IDs stored (Stripe tokens), never actual card numbers.
- PCI DSS compliance via Stripe handling: no card data touches platform servers.

### 10.3 Idempotency Enforcement

All billing operations require `Idempotency-Key` header. Duplicate requests return the original response without re-processing.

Stored in `billing_ledger.idempotency_keys`:
```
idempotency_key: string (client-provided UUID)
endpoint: string
response_body: text
created_at: timestamptz
expires_at: timestamptz (24 hours)
```
