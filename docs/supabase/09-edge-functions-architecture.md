# 9. EDGE FUNCTIONS ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Backend Engineers, AI Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Edge Functions Overview

The platform uses **Supabase Edge Functions** (powered by Deno Deploy) to run globally distributed, serverless TypeScript code. 

Unlike Next.js API routes (which run in the Vercel data center), Supabase Edge Functions run physically adjacent to the Supabase PostgreSQL database (or edge nodes globally). This makes them the ideal location for operations requiring intense database I/O, webhook ingestions, and long-running AI orchestration.

---

## 2. Core Function Categories

### 2.1 The Event Mesh Worker (`outbox-processor`)
The most critical Edge Function in the platform. It acts as the consumption engine for the Transactional Outbox pattern.

- **Trigger**: Database Webhook on `INSERT` to `outbox.events` OR scheduled cron (`* * * * *`).
- **Responsibility**: Reads pending events from the outbox, determines the correct internal handler (e.g., triggering a vector embedding job) or forwards the event to an external message broker (Kafka) for enterprise scaling.
- **Resilience**: Must implement exponential backoff and transition failed events to a Dead Letter Queue (`outbox.dead_letter`) after 3 retries.

### 2.2 AI Orchestration Gateways (`ai-inference`, `ai-embed`)
Edge functions are perfectly suited for LLM streaming and orchestration because Deno has native, low-overhead support for Web Streams.

- **`ai-embed`**: Triggered by the `outbox-processor` when a listing is created. Fetches the listing text, calls OpenAI `text-embedding-3-small`, and saves the vector to `ai.embeddings`.
- **`ai-inference`**: Exposes an HTTP endpoint for the Next.js client. Validates the JWT, checks `monetization.ledger_events` to ensure the tenant has sufficient AI Token quota, calls the LLM, and streams the response back to the client while simultaneously logging usage.

### 2.3 Webhook Ingestion (`stripe-webhook`, `custom-integration-webhook`)
External systems (Stripe, external ERPs) cannot sign their requests with Supabase JWTs. 

- **Trigger**: HTTP POST from Stripe.
- **Responsibility**: Validates the Stripe Signature using the webhook secret. Parses the event (e.g., `invoice.payment_succeeded`).
- **Database Action**: Uses the Service Role Key to bypass RLS and insert the transaction into `monetization.ledger_events` and update `platform.subscriptions`.

### 2.4 Auth Hooks (`auth-context`)
As defined in the Authentication Architecture, this function intercepts the GoTrue session refresh to inject the active `tenant_id` into the user's JWT.

---

## 3. Security and Permissions

### 3.1 The Service Role Key
Edge Functions operate outside the context of a logged-in user. To interact with the database, they use the `SERVICE_ROLE_KEY`.

**CRITICAL LAW**: If an Edge Function accepts an HTTP request from a client, it MUST manually validate the JWT and apply RLS itself OR downgrade its permissions before executing queries.

**Correct Pattern (Impersonation):**
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// DO NOT USE THIS CLIENT FOR CLIENT-DRIVEN DATA REQUESTS
const adminClient = createClient(URL, SERVICE_ROLE_KEY);

// USE THIS CLIENT INSTEAD
const authHeader = req.headers.get('Authorization')
const userClient = createClient(URL, ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
// userClient will now correctly trigger Postgres RLS!
```

### 3.2 Secret Management
Secrets (OpenAI keys, Stripe keys) are never hardcoded. They are stored in Supabase Vault and injected as environment variables into the Deno runtime.

---

## 4. Performance and Cold Starts

Deno Edge functions suffer from "Cold Starts" if not invoked regularly.

1. **Pre-warming**: Critical paths (like `auth-context` or `ai-inference`) receive a synthetic ping every 5 minutes from `pg_cron` via the `net` extension to keep the V8 isolate warm.
2. **Import Maps**: To reduce initialization time, external dependencies (like `zod` or `stripe`) must be referenced via an `import_map.json` rather than downloading from `esm.sh` on every cold start.
3. **Database Connection Pooling**: Edge functions MUST connect to Postgres via PgBouncer (Port 6543) or the Supavisor connection pooler, NEVER directly to Port 5432, to avoid connection exhaustion.
