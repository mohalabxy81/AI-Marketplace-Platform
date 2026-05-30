# 9. EDGE FUNCTIONS ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, DevOps
> **Domain**: Serverless Compute

## 1. Executive Summary
Supabase Edge Functions (Deno-based) act as the primary asynchronous workers and external API gateways for the platform. They are designed to be stateless, globally distributed, and extremely fast to spin up, making them ideal for webhook processing, LLM orchestration, and event handling.

## 2. Core Principles
- **Stateless Execution**: Edge functions must not hold internal state between invocations.
- **Service Role Authorization**: Edge functions typically execute using the `SERVICE_ROLE` key to bypass RLS, putting the burden of validation strictly on the function logic.
- **Fail-Safe Processing**: Webhook processors must be idempotent and handle retries gracefully.

## 3. Function Inventory

### 3.1 `semantic-search`
- **Purpose**: Receives a text query, fetches the vector embedding from OpenAI, and calls the Postgres Hybrid Search RPC.
- **Trigger**: HTTP POST from Next.js BFF.
- **Inputs**: `query_string`, `filters`.
- **Outputs**: Top matched listing IDs.
- **Dependencies**: OpenAI API, Postgres RPC.
- **Security**: Validates user JWT.

### 3.2 `embedding-refresh`
- **Purpose**: Generates vector embeddings for new or updated listings.
- **Trigger**: Database Webhook (on `marketplace.listings` insert/update).
- **Inputs**: `listing_id`, `text_payload`.
- **Outputs**: Inserts/Updates into `ai_ops.listing_embeddings`.
- **Dependencies**: OpenAI Embeddings API.
- **Security**: Invoked via Postgres Trigger with secret headers.

### 3.3 `moderation-processing`
- **Purpose**: Pre-publish scan of content using LLMs (GPT-4o-mini).
- **Trigger**: Database Webhook (on listing submission).
- **Inputs**: `listing_id`, `text_content`.
- **Outputs**: Moderation score and suggested status (`PUBLISHED` or `QUARANTINED`).
- **Dependencies**: OpenAI API.
- **Security**: Service Role only.

### 3.4 `billing-webhooks`
- **Purpose**: Syncs Stripe payment states to the local database.
- **Trigger**: HTTP POST from Stripe.
- **Inputs**: Stripe Event Payload (e.g., `invoice.paid`).
- **Outputs**: Updates `billing.subscriptions` or records `billing.invoices`.
- **Dependencies**: Stripe SDK.
- **Security**: Cryptographic verification of the Stripe Webhook Signature.

### 3.5 `event-relay`
- **Purpose**: Reads from the `public.outbox` table and pushes events to external Kafka or ClickHouse clusters.
- **Trigger**: Cron (every 1 minute) or Database Webhook.
- **Inputs**: Outbox events.
- **Outputs**: HTTP POST to Event Broker.
- **Dependencies**: External Event Broker API.
- **Security**: Internal execution only.

## 4. Error Handling & Monitoring
- **Retries**: Functions triggered by Database Webhooks must implement manual DLQ (Dead Letter Queue) logic if the external API (e.g., OpenAI) is down.
- **Logging**: Console output is captured by Supabase Logs. High-criticality errors should fire an alert payload to a monitoring service (e.g., Datadog/Sentry).
