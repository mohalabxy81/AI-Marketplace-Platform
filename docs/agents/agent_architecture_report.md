# Agent Architecture Report

## Executive Summary
This report outlines the structural foundation of the new Agent Platform. The architecture shifts the system from a passive AI-enabled application to an active, autonomous multi-agent ecosystem. By utilizing a dedicated `agents` schema, the platform enforces strict separation of concerns, security, and scalability.

## Core Architectural Pillars

### 1. Agent Registry & Identity (`Phase 2 & 3`)
- **Multi-Tenancy**: Agents are strictly scoped by `company_id`. Platform-level agents exist with a `NULL` company ID.
- **Role-Based Access Control (RBAC)**: Agents operate under specific identities and roles, restricting their blast radius and defining their capabilities within the tenant's context.

### 2. Context & Memory (`Phase 4`)
- **Vector Integration**: Integration with `pgvector` enables semantic search and long-term memory retrieval for agent interactions.
- **State Management**: Agent sessions and working context are persisted, allowing agents to pause, resume, and hand off tasks seamlessly.

### 3. Event-Driven Communication (`Phase 5`)
- **Event Bus**: A robust publish-subscribe mechanism built on `pgmq`. Agents communicate via standardized events, reducing tight coupling and enabling dynamic workflows.

### 4. Autonomous Runtime & Orchestration (`Phase 6 & 9`)
- **Task Execution**: Agents can spawn tasks, handle retries, and execute complex workflows asynchronously via `pg_cron`.
- **Goal & Policy Engines**: The Orchestration layer manages high-level goals and ensures agents operate within predefined boundaries.

## Edge Compute Layer
Agents will execute logic via Supabase Edge Functions, ensuring low-latency, scalable compute that interacts securely with the database layer via Row Level Security (RLS).
