-- =========================================================================
-- Phase 3.1: Reverso Dashboard Foundation Migration
-- File: supabase/migrations/20260523000000_phase3_reverso_admin_foundation.sql
-- =========================================================================

-- Enable uuid-ossp extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SECURITY DEFINER HELPER FUNCTIONS (Prevents RLS Infinite Recursion)
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = user_uuid AND role = 'SUPER_ADMIN' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_platform_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PLATFORM ADMINS REGISTRY TABLE
CREATE TABLE IF NOT EXISTS platform_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN (
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'MODERATOR', 
    'BILLING_ADMIN', 'ANALYTICS_ADMIN', 'AI_OPERATOR', 'TRUST_AND_SAFETY', 'READONLY_AUDITOR'
  )),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_user_id_idx ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS platform_admins_role_idx ON platform_admins(role);

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_admins
CREATE POLICY select_own_admin_profile ON platform_admins
  FOR SELECT
  USING (auth.uid() = user_id AND is_active = true);

CREATE POLICY manage_all_admins ON platform_admins
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- 3. TAMPER-PROOF PLATFORM AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES platform_admins(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL, -- e.g. 'tenant.suspend', 'billing.refund'
  target_type   TEXT NOT NULL, -- e.g. 'listing', 'user', 'company'
  target_id     UUID,
  before_state  JSONB,
  after_state   JSONB,
  ip_address    TEXT NOT NULL,
  user_agent    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit review speed
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_admin ON platform_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_target ON platform_audit_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_audit_logs
CREATE POLICY select_audit_logs ON platform_audit_logs
  FOR SELECT
  USING (is_platform_admin_user(auth.uid()));

CREATE POLICY insert_audit_logs ON platform_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM platform_admins WHERE id = admin_id AND is_active = true));

-- 4. TAMPER-PROOF APPEND-ONLY AUDIT ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION block_audit_mutation_trigger()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'TAMPER ALERT: Modification of the platform audit log is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_tamper_proof_audit
BEFORE UPDATE OR DELETE ON platform_audit_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_mutation_trigger();
