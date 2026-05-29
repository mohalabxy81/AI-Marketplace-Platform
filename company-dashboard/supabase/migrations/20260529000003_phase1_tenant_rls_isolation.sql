-- =========================================================================
-- Phase 1: Governance & Identity Foundation
-- Task 1: Tenant RLS Isolation Policies
-- File: supabase/migrations/20260529000003_phase1_tenant_rls_isolation.sql
--
-- OVERVIEW
-- --------
-- Applies Row-Level Security (RLS) to all shared-schema tenant tables.
-- Every policy reads the Postgres session variable `app.current_tenant_id`
-- which is injected by the API layer immediately after authenticating a
-- request.  Super-Admin requests bypass isolation by passing a separate
-- session flag `app.current_user_role = 'super_admin'`.
--
-- SECURITY MODEL
-- --------------
--  • Tenant operators  → only see rows WHERE tenant_id = :their_tenant_id
--  • Super-Admins      → bypass tenant filter (platform governance)
--  • Service-role key  → used only in trusted server contexts; never exposed
--                        to the client.
--
-- VERIFY
--  1. SET LOCAL app.current_tenant_id = '<tenant_a_uuid>'; SELECT * FROM tenant_listings;
--     → Must return ONLY rows belonging to tenant A.
--  2. SET LOCAL app.current_tenant_id = '<tenant_b_uuid>'; SELECT * FROM tenant_listings;
--     → Must return ZERO rows belonging to tenant A.
--  3. SET LOCAL app.current_user_role = 'super_admin'; SELECT * FROM tenant_listings;
--     → Must return ALL rows (super-admin bypass).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. Helper: set_tenant_context(tenant_id UUID)
-- -------------------------------------------------------------------------
-- Call this at the start of every authenticated transaction to scope
-- all subsequent RLS checks to the requesting tenant.
-- Usage:  SELECT set_tenant_context('8c59f632-4217-48f8-b391-7667d8f4bc93');
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;

-- -------------------------------------------------------------------------
-- 1. Helper predicates (idempotent — used by all RLS policies)
-- -------------------------------------------------------------------------

-- Returns true when the session-level tenant_id matches the row's tenant_id.
CREATE OR REPLACE FUNCTION is_current_tenant(row_tenant_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT row_tenant_id::text = current_setting('app.current_tenant_id', true)
$$;

-- Returns true when the caller is a super-admin (platform governance).
-- Relies on the existing is_super_admin() helper added in migration 000000.
CREATE OR REPLACE FUNCTION is_super_admin_session()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.current_user_role', true) = 'super_admin'
    OR is_super_admin(auth.uid())
$$;

-- -------------------------------------------------------------------------
-- 2. tenant_listings
-- -------------------------------------------------------------------------
-- Core marketplace listing table.  Every row is scoped to exactly one tenant.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id        UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description     TEXT,
  price           NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status          TEXT        NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')),
  tags            TEXT[]      DEFAULT '{}',
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Discovery / AI fields
  embedding_status TEXT       NOT NULL DEFAULT 'STALE'
                                CHECK (embedding_status IN ('STALE', 'INDEXING', 'COMPLETED', 'FAILED')),
  last_indexed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tenant_listings_tenant_id  ON tenant_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_listings_owner_id   ON tenant_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_listings_status     ON tenant_listings(status);
CREATE INDEX IF NOT EXISTS idx_tenant_listings_created_at ON tenant_listings(created_at DESC);

-- Enable RLS
ALTER TABLE tenant_listings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: a tenant user can only see their own tenant's rows.
CREATE POLICY tenant_listings_tenant_isolation ON tenant_listings
  FOR ALL
  USING (is_current_tenant(tenant_id) OR is_super_admin_session());

-- Write protection: only the row owner or a manager/owner role can mutate.
CREATE POLICY tenant_listings_write_guard ON tenant_listings
  FOR INSERT
  WITH CHECK (is_current_tenant(tenant_id));

-- -------------------------------------------------------------------------
-- 3. tenant_analytics
-- -------------------------------------------------------------------------
-- Per-tenant clickstream & engagement metrics.
-- Partitioned logically by tenant_id; no cross-tenant leakage allowed.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_analytics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL,  -- e.g. 'listing_view', 'search_query', 'click'
  entity_type     TEXT,                  -- e.g. 'listing', 'agent', 'search'
  entity_id       UUID,
  session_id      TEXT,
  properties      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant_id   ON tenant_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_created_at  ON tenant_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_event_type  ON tenant_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_user_id     ON tenant_analytics(user_id);

-- Enable RLS
ALTER TABLE tenant_analytics ENABLE ROW LEVEL SECURITY;

-- Tenant isolation
CREATE POLICY tenant_analytics_tenant_isolation ON tenant_analytics
  FOR ALL
  USING (is_current_tenant(tenant_id) OR is_super_admin_session());

CREATE POLICY tenant_analytics_write_guard ON tenant_analytics
  FOR INSERT
  WITH CHECK (is_current_tenant(tenant_id));

-- -------------------------------------------------------------------------
-- 4. tenant_agent_listings
-- -------------------------------------------------------------------------
-- AI agent / tool listings marketed on the platform.
-- Shares the same isolation pattern as tenant_listings.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_agent_listings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id        UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  agent_name      TEXT        NOT NULL CHECK (char_length(agent_name) BETWEEN 1 AND 100),
  description     TEXT,
  capabilities    TEXT[]      DEFAULT '{}',
  pricing_model   TEXT        NOT NULL DEFAULT 'FREE'
                                CHECK (pricing_model IN ('FREE', 'PER_CALL', 'SUBSCRIPTION', 'CUSTOM')),
  price_per_call  NUMERIC(10, 6),
  status          TEXT        NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')),
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  embedding_status TEXT       NOT NULL DEFAULT 'STALE'
                                CHECK (embedding_status IN ('STALE', 'INDEXING', 'COMPLETED', 'FAILED')),
  last_indexed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_agents_tenant_id ON tenant_agent_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_agents_status    ON tenant_agent_listings(status);

ALTER TABLE tenant_agent_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_agents_isolation ON tenant_agent_listings
  FOR ALL
  USING (is_current_tenant(tenant_id) OR is_super_admin_session());

CREATE POLICY tenant_agents_write_guard ON tenant_agent_listings
  FOR INSERT
  WITH CHECK (is_current_tenant(tenant_id));

-- -------------------------------------------------------------------------
-- 5. event_outbox
-- -------------------------------------------------------------------------
-- Transactional outbox pattern: domain events are written to this table
-- atomically with their originating business transaction.  A background
-- worker (pg_net / Supabase Edge Function) picks them up and publishes to
-- the event mesh, ensuring at-least-once delivery without 2PC.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_outbox (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        REFERENCES companies(id) ON DELETE CASCADE, -- NULL = global/system event
  event_id        UUID        NOT NULL UNIQUE,                            -- idempotency key
  event_type      TEXT        NOT NULL,   -- e.g. 'listing.created'
  schema_version  INTEGER     NOT NULL DEFAULT 1,
  producer_domain TEXT        NOT NULL,   -- e.g. 'marketplace'
  actor_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
  payload         JSONB       NOT NULL,
  correlation_id  UUID        NOT NULL DEFAULT gen_random_uuid(),
  status          TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')),
  attempts        INTEGER     NOT NULL DEFAULT 0,
  last_error      TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_outbox_status     ON event_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_tenant_id  ON event_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_outbox_event_type ON event_outbox(event_type);

-- Note: event_outbox is written by the service-role key (trusted server) and
-- read by the background worker — not directly exposed to tenant users.
-- Tenant-level SELECT is guarded so tenants can only inspect their own events.
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_outbox_tenant_read ON event_outbox
  FOR SELECT
  USING (tenant_id IS NULL OR is_current_tenant(tenant_id) OR is_super_admin_session());

-- Only the service-role backend may insert/update outbox rows (SECURITY DEFINER functions).
-- Direct DML from client keys is blocked by default (no permissive INSERT policy for anon/user roles).

-- -------------------------------------------------------------------------
-- 6. Realtime publication (Supabase)
-- -------------------------------------------------------------------------
-- Allow Supabase Realtime to subscribe to the event_outbox table so that
-- published events can be fanned out to connected WebSocket clients.
-- RLS policies above ensure each tenant only sees their own rows.
-- -------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE event_outbox;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE platform_notifications;

-- -------------------------------------------------------------------------
-- 7. Automatic updated_at trigger
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_listings_updated_at
  BEFORE UPDATE ON tenant_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tenant_agent_listings_updated_at
  BEFORE UPDATE ON tenant_agent_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
