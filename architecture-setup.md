# Plan: Hybrid Architecture Setup (Phase 1 & Phase 2)

This document establishes the roadmap, task breakdown, and verification criteria for implementing the Governance Foundation (Phase 1) and Core Infrastructure (Phase 2) of the AI-Native Multi-Tenant Marketplace Platform.

---

## Overview
This plan defines the development steps to build the solid kernel of the platform, focusing on:
1. **Super Admin Identity & Access Management (RBAC)**
2. **Multi-Tenant Routing Schemas (RLS Database Isolation)**
3. **Reactive Event Grid & Schema Registry**
4. **WebSocket/Realtime Messaging Channels**

---

## Project Type
**WEB & BACKEND**
* Next.js Web Dashboard (`company-dashboard`)
* Kotlin Core Backend Services (`app`)

---

## Success Criteria
- [ ] Authentication layers successfully identify Super Admins, Tenants, and regular users.
- [ ] Database queries automatically enforce tenant isolation boundaries via PostgreSQL Row-Level Security (RLS).
- [ ] Publishing mock events to the event grid dynamically triggers schema validation.
- [ ] The WebSocket handler successfully streams realtime status updates to authenticated clients.

---

## Tech Stack
- **Database**: PostgreSQL with Row-Level Security (RLS) and pgvector extension.
- **Backend Core**: Kotlin JVM with Gradle.
- **Frontend Dashboard**: Next.js App Router, Tailwind CSS, TypeScript.
- **Event Mesh**: PostgreSQL Write-Ahead Log (WAL) listener / Apache Kafka.
- **Realtime**: Supabase Realtime (WebSockets gateway).

---

## Target File Structure Changes
```
/home/mohal665544/pr1
├── app/
│   └── src/
│       └── main/kotlin/com/platform/core/
│           ├── tenant/           # Tenant context resolvers & isolation hooks
│           └── event/            # Kafka/Event-mesh schema validators
└── company-dashboard/
    └── features/
        ├── super-admin/          # Super Admin modules (analytics, telemetry views)
        └── auth/                 # Multi-tenant RBAC claims resolvers
```

---

## Task Breakdown

### Phase 1: Governance & Identity Foundation (P0)

#### Task 1: Tenant RLS PostgreSQL Setup
* **Agent**: `database-architect`
* **Skills**: `database-design`, `prisma-expert`
* **Dependencies**: None
* **Description**: Configure PostgreSQL tables with dynamic `tenant_id` fields and apply strict Row-Level Security (RLS) policies.
* **INPUT**: Abstract database schemas.
* **OUTPUT**: Migration scripts creating RLS policies.
* **VERIFY**: Querying as Tenant A returns zero records belonging to Tenant B.

#### Task 2: Next.js Multi-Tenant Auth Claims Resolver
* **Agent**: `backend-specialist`
* **Skills**: `api-patterns`, `nodejs-best-practices`
* **Dependencies**: None
* **Description**: Create middleware to intercept incoming dashboard requests, authenticate JWTs, and verify tenant-context metadata.
* **INPUT**: Client request containing authentication tokens.
* **OUTPUT**: Context-enriched request headers populated with tenant claims.
* **VERIFY**: Mock request fails if token metadata contains invalid tenant claims.

---

### Phase 2: Core Infrastructure & Event Mesh (P1)

#### Task 3: Schema Registry & Event Validator (Kotlin)
* **Agent**: `backend-specialist`
* **Skills**: `clean-code`, `api-patterns`
* **Dependencies**: Task 1
* **Description**: Build a validation component to audit JSON payloads against registered schemas.
* **INPUT**: Incoming JSON event string.
* **OUTPUT**: Parsed typed Kotlin object or validation error exception.
* **VERIFY**: Invalid properties in event payloads trigger explicit schema registry validation errors.

#### Task 4: Supabase Realtime WebSocket Connection Handler
* **Agent**: `frontend-specialist`
* **Skills**: `react-best-practices`, `frontend-design`
* **Dependencies**: Task 2
* **Description**: Integrate the client-side socket listener to stream live feed re-ranking notifications and moderation events.
* **INPUT**: WebSocket connection parameters and tenant claims.
* **OUTPUT**: Stable client connection receiving live structured feeds.
* **VERIFY**: Mock events published to the PostgreSQL WAL broadcast immediately to active connected clients.

---

## Phase X: Final Verification

To complete this phase, all of the following commands must execute cleanly:

```bash
# 1. Run codebase audits
python3 .agent/scripts/checklist.py .

# 2. Compile and package Kotlin application
./gradlew build -x test

# 3. Compile Next.js dashboard project
cd company-dashboard && npm run build
```

- [ ] Socratic Gate was respected during implementation.
- [ ] No purple/violet color hex codes were added to dashboard styles.
