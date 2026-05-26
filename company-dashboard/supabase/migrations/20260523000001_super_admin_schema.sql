-- =========================================================================
-- Phase 3.2: Reverso Dashboard Operational Schema Migration
-- File: supabase/migrations/20260523000001_super_admin_schema.sql
-- =========================================================================

-- 1. BILLING ENGINE TABLES
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT NOT NULL UNIQUE,
  plan_id                 TEXT NOT NULL,
  status                  TEXT NOT NULL,
  price_id                TEXT NOT NULL,
  quantity                INTEGER NOT NULL DEFAULT 1,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_invoice_id       TEXT NOT NULL UNIQUE,
  subscription_id         UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
  amount_due              INTEGER NOT NULL,
  amount_paid             INTEGER NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'usd',
  status                  TEXT NOT NULL,
  invoice_pdf             TEXT,
  hosted_invoice_url      TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID REFERENCES companies(id) ON DELETE SET NULL,
  event_type              TEXT NOT NULL,
  payload                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_tracking (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_name           TEXT NOT NULL,
  quantity_used           INTEGER NOT NULL DEFAULT 0,
  tracked_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quota_usage (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_name           TEXT NOT NULL,
  limit_amount            INTEGER NOT NULL,
  current_usage           INTEGER NOT NULL DEFAULT 0,
  reset_at                TIMESTAMPTZ NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_company_resource UNIQUE (company_id, resource_name)
);

CREATE TABLE IF NOT EXISTS tenant_entitlements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_name            TEXT NOT NULL,
  is_enabled              BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_company_feature UNIQUE (company_id, feature_name)
);

-- 2. TRUST & SAFETY (MODERATION) TABLES
CREATE TABLE IF NOT EXISTS moderation_queues (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_type             TEXT NOT NULL, -- 'listing', 'user'
  target_id               UUID NOT NULL,
  priority                TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status                  TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ESCALATED')),
  risk_score              NUMERIC(5, 2) DEFAULT 0.00,
  reports_count           INTEGER NOT NULL DEFAULT 0,
  details                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to             UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id           UUID NOT NULL REFERENCES moderation_queues(id) ON DELETE CASCADE,
  action_taken            TEXT NOT NULL, -- 'ban', 'suspend', 'warning', 'clear'
  actor_id                UUID NOT NULL REFERENCES platform_admins(id),
  justification           TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score                   NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  flags                   TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_verifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  verification_type       TEXT NOT NULL, -- 'kyb', 'domain', 'tax_id'
  document_url            TEXT,
  verified_at             TIMESTAMPTZ,
  verified_by             UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AI GOVERNANCE & TELEMETRY TABLES
CREATE TABLE IF NOT EXISTS ai_configurations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_model_name       TEXT NOT NULL,
  semantic_weight         NUMERIC(3, 2) NOT NULL DEFAULT 0.50,
  keyword_weight          NUMERIC(3, 2) NOT NULL DEFAULT 0.30,
  bm25_weight             NUMERIC(3, 2) NOT NULL DEFAULT 0.20,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by              UUID REFERENCES platform_admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_experiments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  description             TEXT,
  model_a                 TEXT NOT NULL,
  model_b                 TEXT NOT NULL,
  split_percentage        INTEGER NOT NULL DEFAULT 50 CHECK (split_percentage BETWEEN 0 AND 100),
  status                  TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semantic_embeddings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id              UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  embedding_status        TEXT NOT NULL CHECK (embedding_status IN ('STALE', 'INDEXING', 'COMPLETED', 'FAILED')),
  last_indexed_at         TIMESTAMPTZ,
  CONSTRAINT unique_listing_embedding UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS ai_inference_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name              TEXT NOT NULL,
  latency_ms              INTEGER NOT NULL,
  tokens_used             INTEGER NOT NULL,
  status_code             INTEGER NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. OPERATOR SUPPORT TABLES
CREATE TABLE IF NOT EXISTS support_tickets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                 TEXT NOT NULL,
  status                  TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority                TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id               UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id               UUID NOT NULL, -- references users(id) or platform_admins(id) depending on sender_type
  sender_type             TEXT NOT NULL CHECK (sender_type IN ('USER', 'ADMIN')),
  body                    TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BUSINESS BI & TELEMETRY TABLES
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_mrr               NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_tenants           INTEGER NOT NULL DEFAULT 0,
  active_tenants          INTEGER NOT NULL DEFAULT 0,
  open_tickets            INTEGER NOT NULL DEFAULT 0,
  moderation_queue_depth  INTEGER NOT NULL DEFAULT 0,
  snapshot_date           DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RUNTIME ROLLOUT & FEATURE FLAG TABLES
CREATE TABLE IF NOT EXISTS feature_flags (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE,
  description             TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_rollouts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id                 UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  rollout_percentage      INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  target_rules            JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. plans limit: ['enterprise'], ids: [...]
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_flag_rollout UNIQUE (flag_id)
);

-- 7. PLATFORM BROADCAST NOTIFICATIONS
CREATE TABLE IF NOT EXISTS platform_notifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL means global alert to all tenants
  title                   TEXT NOT NULL,
  message                 TEXT NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  broadcast_type          TEXT NOT NULL CHECK (broadcast_type IN ('INFO', 'MAINTENANCE', 'ALERT')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_subs_company ON tenant_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_inv_company ON tenant_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_track_company ON usage_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_mod_queue_status ON moderation_queues(status);
CREATE INDEX IF NOT EXISTS idx_mod_queue_priority ON moderation_queues(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- RLS Enforcement
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inference_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;

-- Helper policies allowing active platform admins to perform all read operations
-- and appropriate roles to perform write operations. For maximum security, we gate on `is_platform_admin_user()`.
CREATE POLICY admin_select_subs ON tenant_subscriptions FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_subs ON tenant_subscriptions FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY admin_select_invoices ON tenant_invoices FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_invoices ON tenant_invoices FOR ALL USING (is_super_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM platform_admins WHERE user_id = auth.uid() AND role = 'BILLING_ADMIN' AND is_active = true
));

CREATE POLICY admin_select_billing_events ON billing_events FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_billing_events ON billing_events FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY admin_select_usage ON usage_tracking FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_usage ON usage_tracking FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_quota ON quota_usage FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_quota ON quota_usage FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_entitlements ON tenant_entitlements FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_entitlements ON tenant_entitlements FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_mod ON moderation_queues FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_mod ON moderation_queues FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_mod_actions ON moderation_actions FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_mod_actions ON moderation_actions FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_fraud ON fraud_scores FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_fraud ON fraud_scores FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_trust ON trust_verifications FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_trust ON trust_verifications FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_ai_config ON ai_configurations FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_ai_config ON ai_configurations FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_ai_exp ON ai_experiments FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_ai_exp ON ai_experiments FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_embeddings ON semantic_embeddings FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_embeddings ON semantic_embeddings FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_inference ON ai_inference_logs FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_inference ON ai_inference_logs FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_tickets ON support_tickets FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_tickets ON support_tickets FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_support_messages ON support_messages FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_support_messages ON support_messages FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_snapshots ON analytics_snapshots FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_snapshots ON analytics_snapshots FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY admin_select_flags ON feature_flags FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_flags ON feature_flags FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_rollouts ON feature_rollouts FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_rollouts ON feature_rollouts FOR ALL USING (is_platform_admin_user(auth.uid()));

CREATE POLICY admin_select_notifications ON platform_notifications FOR SELECT USING (is_platform_admin_user(auth.uid()));
CREATE POLICY admin_all_notifications ON platform_notifications FOR ALL USING (is_platform_admin_user(auth.uid()));
