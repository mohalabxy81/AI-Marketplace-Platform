# 13. BILLING INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, Finance Team
> **Domain**: Monetization & Billing

## 1. Executive Summary
The Billing Infrastructure manages SaaS subscriptions, usage-based metering (AI tokens), and transaction ledgers. It maintains a strictly eventually-consistent replica of the payment processor's state (e.g., Stripe) to authorize access to platform features without requiring synchronous external API calls.

## 2. Core Entities

### `billing.subscriptions`
- Maps `tenant_id` to a `stripe_subscription_id`.
- Tracks `status` (ACTIVE, PAST_DUE, CANCELED), `plan_id`, and billing period dates.

### `billing.plans` & `billing.entitlements`
- Defines the limits for each tier (e.g., Starter plan gets 100 listings, 1M AI tokens).
- Used by the Token Guard and Application Logic to enforce limits.

### `billing.usage_records`
- A high-velocity ledger tracking metered usage (e.g., +500 tokens used).
- Batched and synced to Stripe's Metered Billing API hourly by a cron job to minimize API calls.

## 3. Webhook Architecture
- Stripe is the absolute Source of Truth for financial state.
- A dedicated Edge Function receives Stripe Webhooks, verifies the cryptographic signature, and applies the changes to the `billing` schema using a `SERVICE_ROLE` client.
- This function must be idempotent. If Stripe sends `invoice.paid` twice, the system must handle it without double-crediting.

## 4. Quota Enforcement (Token Guard)
- Before a tenant performs a restricted action (e.g., creating a 101st listing or executing an AI prompt), the system checks the current usage against the `entitlements` table.
- If usage > entitlement, an Outbox event (`quota.exceeded`) is fired, and the user receives a 402 Payment Required HTTP status.

## 5. Monetization Engine (Boost Campaigns)
- Sellers can purchase "Boosts" (Sponsored Listings).
- Handled via `billing.campaigns` with a predefined budget.
- The Discovery Engine checks this table during retrieval. Every time a sponsored listing is clicked, an event is fired to decrement the budget ledger.
