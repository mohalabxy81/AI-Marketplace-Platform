# 🔥 STEP 5 — MONETIZATION & GROWTH INTELLIGENCE ARCHITECTURE

## 1. MONETIZATION PHILOSOPHY
Monetization is not a set of payment screens; it is a **core infrastructure layer** built into every component of the Operating System. By treating monetization as infrastructure, we decouple the *enforcement* of value (billing/quotas) from the *creation* of value (features).

**The Revenue Operating Model:**
- **SaaS Foundation:** Predictable recurring revenue via seat-based or tier-based subscriptions (FREE, PRO, ENTERPRISE).
- **Usage-Based (Consumption):** Billing for direct variable costs, particularly AI inferences (tokens) and premium storage.
- **Marketplace Monetization:** Performance-driven revenue via sponsored discovery, featured listings, and lead-gen fees.
- **AI-Optimized Yield:** Using machine learning to surface upgrades dynamically when tenant propensity to convert is highest.

## 2. SUBSCRIPTION ENGINE ARCHITECTURE
The subscription engine enforces the baseline SaaS model.

**Plan Tiers & Entitlements:**
- **FREE:** 1 seat, 10 active listings, basic search, no AI credits.
- **PRO:** Up to 5 seats, 500 active listings, vector search access, $50 AI credit pool, standard support.
- **ENTERPRISE:** Unlimited seats, unlimited listings, custom AI models, SLA, dedicated CSM.

**Subscription Lifecycle State Machine:**
`created` → `active` ↔ `past_due` → `canceled` → `reactivated`
- **Grace Periods:** Configurable dunning period (e.g., 7 days) where services remain active despite payment failure, ensuring business continuity for the tenant.
- **Mid-Cycle Changes:** Handled via Stripe proration logic, syncing the new plan ID to the tenant record immediately.

## 3. USAGE BILLING ENGINE
A robust, low-latency pipeline to measure consumption without blocking the critical path.

**Metering Dimensions:**
1. **API Call Metering:** Measured at the API Gateway/Edge function level.
2. **AI Inference Metering:** Measured post-completion (prompt + completion tokens).
3. **Listing Slot Metering:** Checked during listing creation.
4. **Team Seat Metering:** Checked during user invitation.

**Architecture:**
- **Metering Buffer:** Events are buffered in memory/Redis and flushed to the database in batches to avoid write contention.
- **Quota Checking:** Read from a fast cache (e.g., Redis or in-memory) updated asynchronously by the metering pipeline.
- **Overage Handling:** Soft limits trigger warnings; hard limits trigger 402 Payment Required errors.

## 4. AI COST vs REVENUE INTELLIGENCE
AI can easily erode margins if unmonitored. This system aligns compute cost with business value.

**Tracking Matrices:**
- **Cost per AI Inference:** Aggregating OpenAI/Anthropic costs per tenant (`tenant_id`, `model`, `tokens`).
- **Cost per Embedding Refresh:** Tracking pgvector update costs.
- **Revenue per Action:** Attributing successful transactions or subscription upgrades to specific AI features.
- **AI ROI Dashboard:** A Super Admin view showing the profitability of AI features. If a model generates high costs but low conversion, it flags an optimization signal.

## 5. MARKETPLACE MONETIZATION ENGINE
Driving yield for tenants while monetizing the platform's distribution power.

**Monetization Levers:**
- **Featured Listings:** Static placement at the top of specific category feeds (paid flat fee).
- **Sponsored Discovery:** Pay-per-click (PPC) or Pay-per-impression (CPM) placement in AI-ranked feeds.
- **Campaigns:** Tenants set budget caps (e.g., $100/mo) to boost visibility.
- **AI-Powered Boost Optimization:** The system recommends boost campaigns to tenants whose listings have high conversion probability but low organic visibility.

## 6. STRIPE INTEGRATION ARCHITECTURE
A highly available, idempotent integration with Stripe.

**Mapping:**
- `organizations.id` ↔ `stripe_customer_id`
- `tenant_subscriptions.plan_id` ↔ `stripe_price_id`
- `tenant_quota_usage` → `Stripe Usage Records` (for metered billing)

**Webhook Pipeline:**
1. Stripe fires webhook to Edge Function.
2. Function validates signature.
3. Check `stripe_webhook_events` table for idempotency (has this event been processed?).
4. Insert event, process logic (e.g., update `tenant_subscriptions` on `invoice.paid`).
5. Acknowledge 200 OK.

## 7. QUOTA ENFORCEMENT ARCHITECTURE
Ensures tenants cannot exceed their paid limits, operating at sub-millisecond latency.

**Enforcement Logic:**
- **API Gateway:** Intercepts requests, checks `tenant_quota_cache`.
- **Modes:** 
  - `soft_limit`: Allows request, dispatches `quota_warning` event.
  - `hard_limit`: Blocks request with HTTP 402.
- **Reset Cycles:** Triggered by Stripe billing cycle boundaries (e.g., monthly).
- **Upgrade Prompts:** Emitted as UI events at 80%, 95%, and 100% utilization.

## 8. GROWTH INTELLIGENCE LAYER
Moving from reactive to proactive revenue management.

**Predictive Models:**
- **Retention Prediction:** Analyzes login frequency, feature adoption, and support tickets to flag churn risk 30 days in advance.
- **Upsell Intelligence:** Identifies FREE/PRO users hitting quota limits or repeatedly visiting premium feature pages.
- **Health Score:** A composite index (0-100) per tenant based on MRR, activity, and quota utilization.

## 9. MONETIZATION ANALYTICS
The single source of truth for platform revenue health.

**Core Metrics tracked in `analytics_snapshots`:**
- **MRR / ARR:** Total and broken down by plan tier.
- **LTV / CAC:** Customer Lifetime Value vs. Acquisition Cost (by channel).
- **AI Margin:** Subscription revenue minus AI compute costs.
- **Sponsored Yield:** Revenue generated from Marketplace Monetization Engine.

## 10. MONETIZATION EVENTS
Event-driven taxonomy powering the monetization domain:

- `subscription_created` / `upgraded` / `downgraded` / `cancelled` / `reactivated`
- `invoice_created` / `paid` / `failed` / `forgiven`
- `quota_consumed` / `warned` / `exceeded` / `reset`
- `sponsored_campaign_created` / `impression_served` / `click_recorded`

**Contract:**
- **Producer:** Billing Service, Stripe Webhook Handler.
- **Consumers:** Notification Service (emails), Analytics Service, UI Store (realtime updates).

## 11. ENTITLEMENT ENFORCEMENT MODEL
Abstracting features from pricing plans.

- **Matrix:** A feature flag system where `feature_key` is mapped to an array of allowed `plan_ids`.
- **Enforcement:** Checked via a fast `hasEntitlement(tenantId, featureKey)` utility in backend controllers and frontend UI guards.
- **Overrides:** Super Admins can inject specific entitlements to a tenant regardless of their plan.

## 12. ADAPTIVE PRICING READINESS
Future-proofing the architecture for dynamic monetization.
- **Usage-Aware:** Infrastructure supports tier-based unit pricing (e.g., first 10k calls $0.01, next 50k calls $0.005).
- **Behavioral Signals:** Capturing event streams that will later train models for dynamic discounting or personalized upsell offers.

## 13. MONETIZATION DOMAIN SERVICE BOUNDARIES
- **Billing Domain:** Owns Stripe integration, invoices, plans.
- **Monetization Domain:** Owns feature entitlements, quotas, marketplace boosts.
- **Analytics Domain:** Consumes billing events, owns MRR calculation.
- **Forbidden:** Core listing domain cannot directly query Stripe. It must check entitlements through the Monetization Domain.

## 14. FAILURE RECOVERY ARCHITECTURE
Resilience against external and internal outages.
- **Stripe Outage:** System degrades to cached entitlements. No active tenants are blocked.
- **Webhook Failures:** Dead letter queue (DLQ) captures failed webhooks for manual or exponential backoff retries.
- **Idempotency:** All payment and quota events require a unique `idempotency_key` to prevent double billing.

## 15. MONETIZATION IMPLEMENTATION ROADMAP

- **Phase M1: Core Subscription & Stripe Integration** (Weeks 1-2)
  - Stripe customer mapping, checkout sessions, webhook handlers.
- **Phase M2: Usage Metering & Quota Enforcement** (Weeks 3-4)
  - Quota cache, API gateway integration, UI upgrade prompts.
- **Phase M3: Marketplace Monetization** (Weeks 5-6)
  - Sponsored listings, boost engine logic, impression tracking.
- **Phase M4: Growth Intelligence** (Weeks 7-8)
  - Health score pipeline, churn prediction jobs.
- **Phase M5: AI Margin Analytics** (Weeks 9-10)
  - Cost tracking integration, Super Admin AI ROI dashboard.
