# 19. SUPABASE EVOLUTION ROADMAP

> **Status**: Approved
> **Target Audience**: Architects, Supabase Engineers
> **Domain**: Evolution Strategy

## 1. Phase AB.1: Core RLS & Multi-Tenancy
- **Objectives**: Solidify the strict tenant isolation boundary using JWT custom claims.
- **Entities Introduced**: `tenant_config.organizations`, `tenant_config.memberships`, `identity.profiles`.
- **Dependencies**: GoTrue Authentication hooks configured.
- **Risks**: Improper JWT claim injection could lock all users out.
- **Validation Criteria**: `check_rls_enabled()` passes 100%. Cross-tenant queries return 0 rows.

## 2. Phase AB.2: Marketplace & Edge Compute
- **Objectives**: Deploy the core listings model and async event webhooks.
- **Entities Introduced**: `marketplace.listings`, `marketplace.leads`, `public.outbox`.
- **Dependencies**: Phase AB.1 Auth flow.
- **Risks**: Webhooks failing under high load.
- **Validation Criteria**: Creating a listing successfully writes to the Outbox.

## 3. Phase AB.3: AI Discovery & pgvector
- **Objectives**: Enable semantic search and embedding storage.
- **Entities Introduced**: `ai_ops.listing_embeddings`, `ai_ops.search_query_embeddings`.
- **Dependencies**: Phase AB.2 Listings. OpenAI API Keys in Vault.
- **Risks**: HNSW index building blocks the database if run synchronously on 1M rows.
- **Validation Criteria**: Hybrid search returns relevant semantic matches in < 50ms.

## 4. Phase AB.4: Realtime & Trust
- **Objectives**: Enable WebSocket feeds and moderation triggers.
- **Entities Introduced**: `trust.moderation_cases`, `trust.tenant_scores`.
- **Dependencies**: Phase AB.2 Webhooks.
- **Risks**: Realtime publication of high-velocity tables causes CPU spikes.
- **Validation Criteria**: Flagged content instantly triggers an Edge Function; clients receive Realtime WebSocket alerts.

## 5. Phase AB.5: Monetization & Analytics
- **Objectives**: Deploy the billing ledger and event streaming to ClickHouse.
- **Entities Introduced**: `billing.subscriptions`, `billing.usage_records`.
- **Dependencies**: Phase AB.1 Tenants, Stripe Account.
- **Risks**: Stripe Webhook race conditions leading to duplicate credit allocations.
- **Validation Criteria**: Stripe `invoice.paid` securely updates the tenant entitlement quota.
