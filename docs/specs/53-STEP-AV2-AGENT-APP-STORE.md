# Phase AV-2: Agent App Store Architecture

> **Document Status**: Draft
> **Phase**: AV-2 (Agent App Store)
> **Owner**: Engineering (Frontend & Discovery)

## 1. Executive Summary
The Agent App Store is the discovery engine for third-party automation. It leverages the platform's existing `Discovery Engine` (Vector Embeddings + Real-time Personalization) to match tenants with the agents most likely to solve their operational bottlenecks.

## 2. Core Components

### 2.1 Agent Catalog (Vector Indexed)
Agent descriptions, capabilities, and tool requirements are embedded using `text-embedding-3-small`.
When a tenant searches "Help me optimize my pricing", the discovery engine runs a cosine similarity search against the Agent Catalog.

### 2.2 1-Click Installation
When a tenant installs an agent, the platform:
1. Provisions an isolated sandbox execution context.
2. Prompts the tenant for an OAuth-style permission grant (e.g., "This agent wants Read/Write access to your `listings` table").
3. Binds the agent to the tenant's Event Mesh topics.

## 3. Developer Publishing Portal
External developers will access a dedicated `/developer` zone to:
- Submit agent code (WASM or Edge Functions).
- Define required platform capabilities (e.g., `capability:read_metrics`).
- Track installation metrics and ARR (Annual Recurring Revenue).

## 4. UI/UX Principles
The Agent App Store will follow the existing **Command Center Brutalism** design language:
- High data density.
- Terminal-style typography.
- Obsidian, Amber, and Teal color palette.
