# SPEC 36 — CODE GENERATION PROMPT PACK
## AI-Adaptive Marketplace Operating System

> **Status**: Sealed — Engineering-Ready
> **Version**: 1.0.0
> **Date**: 2026-05-31
> **Applies To**: AI coding agents, technical leads, and full-stack engineering teams
> **Basis**: Specs 01–35, Database Master Design (Spec 22), Backend Blueprint (Spec 31), Frontend Blueprint (Spec 32), Execution Plan (Spec 35)

---

## SECTION 1 — MASTER PROMPT ARCHITECTURE

This Prompt Pack is structured as a **Hierarchical Code Generation Blueprint**. Rather than attempting single-prompt mega-generations (which hit context limits and output stale code), developers and AI coding agents MUST execute these prompts sequentially using the context inheritance path:

```
                  ┌──────────────────────────────────────────────┐
                  │          CONTEXT INHERITANCE PATH            │
                  │   Spec 22 (DB Master) ──► Spec 31 (Backend)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            DATABASE MIGRATIONS PACK          │
                  │   Prompts: Schemas ──► Tables ──► RLS Rules  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             BACKEND & API WORKERS            │
                  │   Prompts: Repositories ──► Edge Functions   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             FRONTEND FEATURES SHELL          │
                  │   Prompts: Layouts ──► Forms ──► Client Recs │
                  └──────────────────────────────────────────────┘
```

---

## SECTION 2 — DATABASE PROMPT PACK

### Prompt 2.1 — Schema & Structure Generation
```text
Role: Principal Supabase & Database Architect
Task: Generate PostgreSQL database migrations for [SCHEMA_NAME] (e.g., marketplace).
Context: Refer to Database Evolution Master Design (Spec 22).

Instructions:
1. Write a backward-compatible PostgreSQL migration script.
2. Initialize the schema: `CREATE SCHEMA IF NOT EXISTS [SCHEMA_NAME];`
3. Define the target tables with strict type rules:
   - Primary Keys: UUID with `gen_random_uuid()`.
   - Foreign Keys: Explicit FK targets with `ON DELETE RESTRICT` or `ON DELETE CASCADE`.
   - Timestamps: Always include `created_at` and `updated_at` with default values of `NOW()`.
4. Deploy the auto-updating trigger on all tables:
   ```sql
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```
5. Enforce constraints (CHECK, UNIQUE indexes, and non-nullable parameters).
6. Ensure zero select-star triggers are present. Output the query statement.
```

---

## SECTION 3 — AUTHENTICATION PROMPT PACK

### Prompt 3.1 — Tenant Context JWT Injector
```text
Role: Senior Supabase Security Engineer
Task: Create a Deno Edge Function to enrich JWT session tokens with active tenant memberships.
Context: Refer to Supabase Auth Engineering (Spec 31, Section 4).

Instructions:
1. Write a clean TypeScript Edge Function (`supabase/functions/auth-context/index.ts`).
2. Intercept incoming authentication requests, validating the bare bearer JWT.
3. Query the `identity.tenant_members` table:
   - Validate if `sub (user_id)` matches `user_id` inside the specified `tenant_id`.
4. If authenticated membership is verified:
   - Call `supabase.auth.admin.updateUserById(sub, { app_metadata: { tenant_id, role } })`.
5. Return a `200 OK` response with JSON payload confirming context injection, enabling the client to refresh session cookies.
6. Enforce error handling and log security events using structured formats.
```

---

## SECTION 4 — BACKEND PROMPT PACK

### Prompt 4.1 — Type-Safe CRUD Repository
```text
Role: Staff Full-Stack Engineer
Task: Create a type-safe database repository class for a target entity (e.g., listings).
Context: Refer to Data Access & Repository Layer (Spec 32, Section 9).

Instructions:
1. Write a TypeScript repository class utilizing the typed Supabase Client (`@supabase/supabase-js`).
2. Implement methods: `getById()`, `list()`, `create()`, and `update()`.
3. Force schema targeting using strict type mapping definitions:
   ```typescript
   import { supabase } from '@/lib/supabase/client'
   import type { Database } from '@/types/database.types'
   
   export type Listing = Database['marketplace']['Tables']['listings']['Row']
   ```
4. Prevent SQL injection by parameterizing all queries using standard client builders.
5. Implement error recovery wrappers to capture database messages and map them to custom API codes.
```

---

## SECTION 5 — FRONTEND PROMPT PACK

### Prompt 5.1 — Search Grid & Faceted Filters
```text
Role: Next.js 15 App Router Expert
Task: Generate a faceted search search results dashboard with virtualized list scrolling.
Context: Refer to Frontend Search Experience (Spec 32, Section 11).

Instructions:
1. Build a responsive layout (`app/(public)/search/page.tsx`) utilizing Tailwind CSS v4.
2. Implement search state parameterization using Next.js router query parameters.
3. Renders a left-hand filter card with input sliders, category checkboxes, and geolocation selectors.
4. Renders a central virtualized infinite scroll grid powered by `@tanstack/react-virtual` for stable rendering performance.
5. Fetch search results asynchronously using TanStack Query, mapping optimistic changes.
```

---

## SECTION 6 — COMPANY DASHBOARD PROMPT PACK

### Prompt 6.1 — Listing Wizard Wizard Form
```text
Role: Lead Product Engineer
Task: Create a multi-step listing editor form with auto-save drafts features.
Context: Refer to Forms Architecture (Spec 32, Section 8).

Instructions:
1. Write a Next.js multi-step form wrapper utilizing React Hook Form and Zod schemas.
2. Segment inputs across three steps: Step 1 (Base metadata), Step 2 (Category specific parameters), Step 3 (Media attachments upload).
3. Implement local state buffering synchronizing progress steps to the URL query string (`?step=x`).
4. Integrate a debounced auto-save hook writing partial form state changes to `outbox.drafts` via Edge Function endpoints.
```

---

## SECTION 7 — PLATFORM ADMIN PROMPT PACK

### Prompt 7.1 — Content Moderation Queue
```text
Role: Enterprise UI/UX Specialist
Task: Generate a high-density, secure moderation monitoring dashboard.
Context: Refer to Dashboard Experiences (Spec 32, Section 14).

Instructions:
1. Render a search-and-action data grid showing reported listings, categories, and reviews.
2. Implement action buttons: Approve listing (status='active'), Reject listing (status='rejected'), and Quarantine media (locks CDN URLs).
3. Require step-up Multi-Factor Authentication (MFA) validation prior to running moderation executions.
4. Log all action details programmatically to `governance.audit_logs` using immutable audit trail APIs.
```

---

## SECTION 8 — AI PLATFORM PROMPT PACK

### Prompt 8.1 — Real-Time Vector Embeddings Generator
```text
Role: Principal AI Architect
Task: Generate a Deno Edge Function that automatically vectorizes listing listings on updates.
Context: Refer to AI Embedding Architecture (Spec 33, Section 7).

Instructions:
1. Create a TypeScript function (`supabase/functions/ai-embed/index.ts`) listening to webhook events.
2. Verify incoming webhooks using secure SHA-256 header signatures.
3. Extract updated fields (title, description, tags) and format them into normalized text strings.
4. Send payloads to the OpenAI embedding endpoint (`text-embedding-3-small`) using provider abstractions with fallback retry handling.
5. Insert generated float arrays into the `ai.embeddings` database using parameter queries.
```

---

## SECTION 9 — SEARCH PROMPT PACK

### Prompt 9.1 — Hybrid BM25 & Semantic Search Queries
```text
Role: PostgreSQL & Search Expert
Task: Generate a database query combining full-text search with vector similarity using Reciprocal Rank Fusion.
Context: Refer to Search Intelligence (Spec 33, Section 6).

Instructions:
1. Write an optimized PostgreSQL function `discovery.hybrid_search(query_text TEXT, tenant_val UUID)`.
2. Extract text query embeddings by calling `ai.embeddings` helper clients.
3. Compute semantic vector cosine distances over active tenant entities.
4. Compute full-text BM25 rankings using target GIN index profiles.
5. Blend scores using a Reciprocal Rank Fusion (RRF) algorithm:
   $$\text{RRF Score} = \frac{1}{\text{Rank}_{\text{FullText}} + 60} + \frac{1}{\text{Rank}_{\text{Vector}} + 60}$$
6. Return a ranked, metadata-enriched search listings payload.
```

---

## SECTION 10 — RECOMMENDATION PROMPT PACK

### Prompt 10.1 — Content-Based Similarity Recommendations
```text
Role: Recommendation Systems Engineer
Task: Create a recommendation repository querying similar listings.
Context: Refer to Recommendation Engine (Spec 33, Section 5).

Instructions:
1. Write a repository method retrieving similar recommendations for listing profile screens.
2. Execute a database call querying cosine distances in `ai.embeddings` matching the active listing's vector.
3. Apply filters: active listing statuses, same tenant boundaries, and distinct item exclusions.
4. Set a sub-50ms latency budget and cache retrieved IDs in Upstash Redis (5-minute TTL).
```

---

## SECTION 11 — BILLING PROMPT PACK

### Prompt 11.1 — Stripe Webhook Event Controller
```text
Role: Staff Backend Engineer
Task: Generate a resilient Stripe webhook server integrating tenant subscription plans.
Context: Refer to Integration Contracts (Spec 30, Section 6).

Instructions:
1. Write a Deno Edge Function (`supabase/functions/stripe-webhook/index.ts`).
2. Validate incoming payloads using official Stripe endpoint signatures.
3. Parse billing events: `customer.subscription.created` and `customer.subscription.updated`.
4. Map subscription configurations to active database planes, modifying tenant limits (`plan_tier` and quotas).
5. Log transaction logs and implement reliable queue retries.
```

---

## SECTION 12 — NOTIFICATION PROMPT PACK

### Prompt 12.1 — Real-Time WebSocket Message Broker
```text
Role: Distributed Systems Specialist
Task: Establish real-time communication notification synchronization pipelines.
Context: Refer to Realtime UX (Spec 32, Section 12).

Instructions:
1. Initialize a custom Supabase Realtime channel listener in the React client.
2. Subscribe to WAL table mutations targeting `communication.notifications` where `user_id` matches the current session.
3. Append incoming alert objects directly to Zustand global notification slices.
4. Display accessible slide-in toast notifications featuring direct click-through routing properties.
```

---

## SECTION 13 — ANALYTICS PROMPT PACK

### Prompt 13.1 — Clickstream Telemetry Buffering Pipeline
```text
Role: Data Platform Architect
Task: Generate a high-velocity telemetry ingestion Edge Function.
Context: Refer to Analytics Engine (Spec 33, Section 11).

Instructions:
1. Create a lightweight TypeScript function (`supabase/functions/telemetry-ingest/index.ts`).
2. Accept JSON client action event objects (page views, clicks, dwell times).
3. Validate payloads against schema parameters using Zod.
4. Buffer records in memory and batch insert events directly into ClickHouse database clusters.
5. Return immediate `202 Accepted` statuses to client callers.
```

---

## SECTION 14 — TESTING PROMPT PACK

### Prompt 14.1 — End-to-End Playwright Validation Suite
```text
Role: Principal QA Automation Engineer
Task: Create a robust E2E test verifying tenant isolation and onboarding pipelines.
Context: Refer to Testing Architecture (Spec 32, Section 20).

Instructions:
1. Write a clean Playwright test (`tests/e2e/tenant-onboarding.spec.ts`).
2. Simulate a guest user accessing a public landing page.
3. Execute registration flows and verify onboarding details pipelines.
4. Confirm successful redirection to secure dashboard workspaces.
5. Attempt a cross-tenant read action to verify that database RLS rules block unauthorized queries.
```

---

## SECTION 15 — DEVOPS PROMPT PACK

### Prompt 15.1 — GitHub Actions Continuous Integration pipeline
```text
Role: Senior Cloud Infrastructure Engineer
Task: Build a multi-stage GitHub Actions CI workflow to validate PR commits.
Context: Refer to CI/CD Blueprint (Spec 34, Section 4).

Instructions:
1. Write a complete workflow configuration (`.github/workflows/ci.yml`).
2. Trigger the job on any PR targeted to the `main` branch.
3. Stage NPM environments, install dependencies, and run lint audits.
4. Run all unit and integration testing tasks.
5. Run Supabase CLI schema verification tasks (`supabase db lint`).
```

---

## SECTION 16 — CODE QUALITY CHECKLIST

All prompt generations MUST explicitly instruct the AI agent to:
- Use TypeScript strict mode and omit `any` parameters.
- Follow SOLID guidelines and Clean Architecture structures.
- Group components under domain-bounded folders (`features/`).
- Use accessible outlines and ARIA labels.
- Achieve $>80\%$ unit testing coverage.

---

## SECTION 17 — PRODUCTION READINESS CHECKLIST

Before deploying generated code:
* [ ] Database migration rollback configurations verified.
* [ ] Multi-tenant RLS rules validated.
* [ ] WAF filter rule mappings deployed.
* [ ] Observability traces and alert targets configured.

---

## SECTION 18 — CODE GENERATION ROADMAP

```
  Phase 1: DB & Auth  ──►  Phase 2: Core UX  ──►  Phase 3: Integrations  ──►  Phase 4: AI & Scale
  (Migrations & Context)   (Search & Dashboard)   (Stripe & Telemetry)       (Vector search & RRF)
```

The generation sequence follows the dependency path of the platform architecture, starting with base schemas and authentication contexts, before moving to dashboards and hybrid search, and ending with real-time vector recommendation tuning.
