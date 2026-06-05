-- ============================================================
-- Phase AT.P5 — Agent Event Bus
-- ============================================================
-- Creates the event-driven architecture for agents using pgmq.
-- ============================================================

-- Ensure pgmq is available
CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_events (Audit/Log of events)
-- Actual queuing is handled by pgmq, this is an archival table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT NOT NULL,
    source      TEXT NOT NULL, -- E.g. 'system', 'agent:recommendation'
    payload     JSONB NOT NULL DEFAULT '{}',
    company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_events_type_idx ON agents.agent_events(event_type, created_at);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_event_subscriptions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_event_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL, -- e.g. 'ListingCreated', 'TrustVerified'
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, event_type)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_event_handlers
-- Defines the action an agent takes when an event fires
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_event_handlers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id  UUID NOT NULL REFERENCES agents.agent_event_subscriptions(id) ON DELETE CASCADE,
    action_type      TEXT NOT NULL CHECK (action_type IN ('webhook', 'db_function', 'edge_function', 'pgmq_enqueue')),
    action_target    TEXT NOT NULL, -- E.g. URL, function name, or queue name
    payload_template JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE agents.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_event_handlers ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_events_admin ON agents.agent_events FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_event_subscriptions_admin ON agents.agent_event_subscriptions FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_event_handlers_admin ON agents.agent_event_handlers FOR ALL USING (public.is_platform_admin_user(auth.uid()));

-- Initialize base pgmq queues for the agents
SELECT pgmq.create('agent_event_bus');
SELECT pgmq.create('agent_tasks_queue');
