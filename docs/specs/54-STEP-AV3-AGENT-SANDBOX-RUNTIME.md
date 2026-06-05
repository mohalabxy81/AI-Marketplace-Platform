# Phase AV-3: Agent Sandbox Runtime

> **Document Status**: Draft
> **Phase**: AV-3 (Agent Runtime)
> **Owner**: Engineering (Infrastructure)

## 1. Executive Summary
Third-party agents represent arbitrary code executing on behalf of our tenants. To prevent data exfiltration, noisy neighbor issues, and resource exhaustion, all third-party agents must run within a strict **Zero-Trust Sandbox Runtime**.

## 2. Architecture

### 2.1 Execution Environment (Edge/WASM)
- Agents are deployed as WebAssembly (WASM) modules or V8 Edge isolate functions (e.g., Deno Deploy / Cloudflare Workers).
- Node.js APIs (e.g., `fs`, `child_process`) are completely stripped.
- Network access is strictly restricted. Agents cannot make arbitrary `fetch()` calls to external servers unless explicitly allowlisted during the publishing phase.

### 2.2 Communication via Event Mesh
Agents do not communicate directly with the Postgres database. They operate purely on an event-driven basis:
1. Agent subscribes to `tenant.event.ticket_created`.
2. Agent processes the payload.
3. Agent publishes `tenant.action.update_ticket`.
The core platform acts as the execution gateway, ensuring Row-Level Security (RLS) policies are enforced on every emitted action.

## 3. Resource Limits (Token Guard Extension)
The `Token Guard` (Phase AU) will be extended to constrain third-party agents:
- Maximum execution time per event: `500ms`
- Maximum LLM tokens per action: `4096 tokens`
- Rate limits: 50 events per second per tenant context.

## 4. Monitoring & Telemetry
If a third-party agent crashes or hits a rate limit, the `profiler.service` logs the error to the tenant's `platform_audit_logs`. Super Admins can globally disable any agent instantly by flipping the `is_active` flag in the registry, instantly terminating its execution contexts.
