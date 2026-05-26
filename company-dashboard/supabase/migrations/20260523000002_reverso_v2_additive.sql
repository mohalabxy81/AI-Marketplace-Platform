-- =========================================================================
-- Phase 3.3: Reverso Dashboard v2.0 Additive Migration
-- File: supabase/migrations/20260523000002_reverso_v2_additive.sql
-- NOTE: Additive only — no breaking changes to existing tables.
-- =========================================================================

-- 1. IMPERSONATION SESSIONS (time-boxed, fully audited)
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
  target_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  justification     TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  ended_at          TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON impersonation_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target ON impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(is_active, expires_at);

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY imp_select ON impersonation_sessions
  FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY imp_insert ON impersonation_sessions
  FOR INSERT WITH CHECK (is_platform_admin_user(auth.uid()));
CREATE POLICY imp_update ON impersonation_sessions
  FOR UPDATE USING (is_platform_admin_user(auth.uid()));

-- 3. platform_admins: last_login_at and created_by already exist in
--    20260523000000_phase3_reverso_admin_foundation.sql — no action needed.

-- 3. Add missing analytics_snapshots columns
ALTER TABLE analytics_snapshots
  ADD COLUMN IF NOT EXISTS churn_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS new_tenants_30d INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_revenue_per_tenant NUMERIC(15,2) NOT NULL DEFAULT 0.00;

-- 4. Support tickets: add assigned_to column if not present
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES platform_admins(id) ON DELETE SET NULL;

-- 5. Moderation queues: ensure behavioural signals jsonb column
ALTER TABLE moderation_queues
  ADD COLUMN IF NOT EXISTS behavioural_signals JSONB NOT NULL DEFAULT '{}';

-- 6. Feature flags: add updated_by admin reference
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL;

-- 7. Platform notifications: add scope column for targeted broadcasts
ALTER TABLE platform_notifications
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'all'
    CHECK (scope_type IN ('all', 'plan_specific', 'company_specific'));

-- 8. AI configurations: add config versioning
ALTER TABLE ai_configurations
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS config_label TEXT NOT NULL DEFAULT 'default';

-- 9. Performance indexes (only NEW indexes — audit log indexes already in foundation migration)
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_analytics_snap_date ON analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_mod_queue_risk ON moderation_queues(risk_score DESC);

-- 10. platform_notifications RLS & policies already defined in
--     20260523000001_super_admin_schema.sql (L252, L315-316) — no action needed.
