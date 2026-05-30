# 1. SUPABASE OPERATING MODEL

> **Status**: Approved
> **Target Audience**: Platform Engineers, Backend Engineers, DevOps
> **Domain**: Core Architecture

## 1. Executive Summary
The Supabase Operating Model defines how Supabase functions as the heart of the AI-Native Marketplace Operating System. Supabase is not merely a "database-as-a-service" in this architecture; it acts as the centralized Event Mesh, State Engine, and Identity Provider. 

## 2. Why Supabase is the Platform Core
The platform demands extreme low-latency matching, multi-tenant isolation, and real-time state synchronization. Supabase enables this by unifying PostgreSQL (the world's most robust RDBMS) with PgBouncer (connection pooling), PostgREST (auto-generated APIs), GoTrue (Identity), Realtime (Elixir-based WebSockets), and pgvector (Vector search). This cohesive stack eliminates the need to build and maintain separate microservices for identity, realtime, and API routing, dramatically reducing architectural complexity while increasing performance through data locality.

## 3. System Responsibilities

### 3.1 Responsibilities of Supabase
- **Identity & Access Management**: GoTrue handles OAuth, JWT generation, and MFA.
- **Data Persistence**: PostgreSQL stores all relational data (listings, leads, tenants).
- **Security Enforcer**: Row Level Security (RLS) acts as the final, un-bypassable gatekeeper for multi-tenant isolation.
- **Vector Operations**: pgvector handles high-performance similarity search for embeddings.
- **Realtime Backplane**: Supabase Realtime manages WebSocket connections, presence, and change-data-capture (CDC) broadcasts.
- **Asset Storage**: Supabase Storage manages media uploads, resizing, and CDN edge delivery.

### 3.2 Responsibilities of Next.js (Frontend & BFF)
- **UI Rendering**: Next.js 15 (App Router) renders React Server Components for SEO and fast initial loads.
- **Client State**: Zustand and TanStack Query manage optimistic UI updates and local data caching.
- **BFF (Backend-For-Frontend)**: Next.js API Routes handle complex request orchestration, SSR data fetching, and HTML rendering. It does *not* hold business state.
- **Edge Routing**: Vercel Edge Middleware handles localized redirects and early auth checks before hitting Supabase.

### 3.3 Responsibilities of Edge Functions (Supabase/Deno)
- **High-Velocity Webhooks**: Ingesting Stripe billing events or third-party API callbacks.
- **AI Orchestration**: Calling OpenAI/Anthropic APIs, managing streaming responses, and inserting inference logs.
- **Event Forwarding**: Reading from the Postgres Outbox table and pushing complex events to Kafka or external services.
- **Asynchronous Heavy Lifting**: Background tasks like resizing images or recalculating trust scores.

### 3.4 Responsibilities of AI Infrastructure
- **Model Execution**: External providers (OpenAI) or internal hosted models generate embeddings, semantic text, and moderation scores.
- **Prompt Registry**: Managed within Supabase, versioning prompts and system instructions.
- **Token Guarding**: A dedicated Edge Function or external Rust gateway tracks token usage against tenant quotas *before* dispatching to the LLM.

## 4. System Responsibility Matrix

| Component | Responsibility Category | Execution Environment | Primary Output |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | Data, RLS, Vectors | Supabase Database | Persistent State, pgvector |
| **GoTrue** | Authentication | Supabase Auth | JWTs, Session Cookies |
| **PostgREST** | CRUD API | Supabase REST | JSON responses |
| **Realtime** | WebSocket Push | Supabase Realtime | Live State Updates |
| **Next.js Server** | SSR, Complex Logic | Node.js (Vercel) | HTML, Server Actions |
| **Next.js Client** | Interaction, Optimistic UI| Browser | DOM Updates |
| **Edge Functions** | Webhooks, LLM Proxy | Deno (Supabase Edge) | Async Jobs, Streaming |
| **AI Gateway** | Rate Limiting, LLM routing | Rust/Go (External) | LLM Responses |
