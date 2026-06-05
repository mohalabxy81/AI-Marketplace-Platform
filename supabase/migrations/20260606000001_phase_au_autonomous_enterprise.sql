-- ============================================================
-- Phase AU Migration: Autonomous Enterprise Infrastructure
-- ============================================================
-- Migration ID: 20260606000001_phase_au_autonomous_enterprise
-- Phase: AU (Autonomous Enterprise Execution)
-- Workstreams: AU.1-AU.10
-- ============================================================

-- Create autonomous schema
CREATE SCHEMA IF NOT EXISTS autonomous;

-- ── Policy Registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.policy_registry (
  policy_id           TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('FINANCIAL','CONTENT','SECURITY','OPERATIONAL','COMPLIANCE','REPUTATIONAL')),
  conditions          JSONB NOT NULL DEFAULT '{}',
  autonomy_level      TEXT NOT NULL CHECK (autonomy_level IN ('AUTONOMOUS_EXECUTION','AGENT_APPROVED','AI_RECOMMENDED','HUMAN_DECISION','BOARD_DECISION')),
  override_by         TEXT[] NOT NULL DEFAULT '{}',
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until     TIMESTAMPTZ,
  last_reviewed       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Decision Logs (append-only, immutable audit trail) ─────────────────────

CREATE TABLE IF NOT EXISTS autonomous.decision_logs (
  decision_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  target_entity_id    UUID,
  target_entity_type  TEXT CHECK (target_entity_type IN ('tenant','listing','user','platform','campaign')),
  autonomy_level      TEXT NOT NULL CHECK (autonomy_level IN ('AUTONOMOUS_EXECUTION','AGENT_APPROVED','AI_RECOMMENDED','HUMAN_DECISION','BOARD_DECISION')),
  policy_id           TEXT REFERENCES autonomous.policy_registry(policy_id),
  risk_score          NUMERIC(5,4) NOT NULL DEFAULT 0,
  approved            BOOLEAN NOT NULL DEFAULT false,
  approved_by         TEXT,
  expected_impact_usd NUMERIC(12,2),
  actual_impact_usd   NUMERIC(12,2),
  context             JSONB NOT NULL DEFAULT '{}',
  outcome             JSONB,
  outcome_status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (outcome_status IN ('PENDING','SUCCESS','FAILED','REVERSED')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

-- ── Agent Activity Registry ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.agent_activity (
  activity_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL,
  agent_type          TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  target_tenant_id    UUID,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INTEGER,
  tokens_used         INTEGER DEFAULT 0,
  expected_impact_usd NUMERIC(12,2),
  actual_impact_usd   NUMERIC(12,2),
  outcome_status      TEXT,
  error_message       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'
);

-- ── Autonomy Metrics (hourly snapshots) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.autonomy_metrics (
  metric_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autonomy_score           NUMERIC(5,4),    -- 0.0–1.0 (ratio of autonomous decisions)
  agent_utilization        NUMERIC(5,4),    -- 0.0–1.0
  automation_rate          NUMERIC(5,4),    -- 0.0–1.0
  revenue_impact_usd       NUMERIC(12,2),   -- monthly
  cost_savings_usd         NUMERIC(12,2),   -- monthly
  resolution_rate          NUMERIC(5,4),    -- ticket auto-resolution rate
  trust_score_avg          NUMERIC(5,4),    -- platform-wide avg trust score
  risk_score               NUMERIC(5,4),    -- composite platform risk (lower is better)
  total_decisions          INTEGER NOT NULL DEFAULT 0,
  autonomous_decisions     INTEGER NOT NULL DEFAULT 0,
  agent_hours              NUMERIC(8,2),
  active_agent_count       INTEGER DEFAULT 0,
  autonomous_enterprise_index INTEGER,       -- composite 0–100 score
  maturity_level           TEXT
);

-- ── Knowledge Graph ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.knowledge_nodes (
  node_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type           TEXT NOT NULL CHECK (node_type IN ('concept','entity','fact','procedure','insight')),
  content             TEXT NOT NULL,
  embedding           VECTOR(1536),
  metadata            JSONB NOT NULL DEFAULT '{}',
  tenant_id           UUID,  -- NULL = platform-wide knowledge
  source_agent        TEXT,
  confidence          NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence BETWEEN 0 AND 1),
  access_count        INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autonomous.knowledge_edges (
  edge_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id      UUID NOT NULL REFERENCES autonomous.knowledge_nodes(node_id) ON DELETE CASCADE,
  target_node_id      UUID NOT NULL REFERENCES autonomous.knowledge_nodes(node_id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL CHECK (relationship_type IN ('relates_to','causes','requires','contradicts','supports','derived_from')),
  weight              NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Risk Scores ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.risk_scores (
  score_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('platform','tenant','agent','decision','campaign')),
  entity_id           TEXT,
  risk_score          NUMERIC(5,4) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  risk_factors        JSONB NOT NULL DEFAULT '{}',
  severity            TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until         TIMESTAMPTZ,
  alert_triggered     BOOLEAN NOT NULL DEFAULT false
);

-- ── Approval Requests ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autonomous.approval_requests (
  approval_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id          UUID REFERENCES autonomous.decision_logs(decision_id),
  autonomy_level       TEXT NOT NULL,
  required_role        TEXT NOT NULL,
  fallback_role        TEXT,
  deadline             TIMESTAMPTZ NOT NULL,
  escalation_after_ms  INTEGER NOT NULL DEFAULT 14400000,  -- 4 hours
  context              JSONB NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','EXPIRED')),
  approved_by          TEXT,
  rejection_reason     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_decision_logs_agent_time
  ON autonomous.decision_logs(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_logs_tenant
  ON autonomous.decision_logs(target_entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_logs_autonomy
  ON autonomous.decision_logs(autonomy_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activity_tenant
  ON autonomous.agent_activity(target_tenant_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent
  ON autonomous.agent_activity(agent_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomy_metrics_time
  ON autonomous.autonomy_metrics(snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding
  ON autonomous.knowledge_nodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type
  ON autonomous.knowledge_nodes(node_type, tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_scores_entity
  ON autonomous.risk_scores(entity_type, entity_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_scores_severity
  ON autonomous.risk_scores(severity, alert_triggered, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON autonomous.approval_requests(status, deadline);

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE autonomous.decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.autonomy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY decision_logs_super_admin ON autonomous.decision_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY agent_activity_super_admin ON autonomous.agent_activity
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY approval_requests_super_admin ON autonomous.approval_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY autonomy_metrics_super_admin ON autonomous.autonomy_metrics
  FOR SELECT USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY risk_scores_super_admin ON autonomous.risk_scores
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

-- Knowledge nodes: tenant-scoped read + platform-wide read for authenticated users
CREATE POLICY knowledge_nodes_tenant ON autonomous.knowledge_nodes
  FOR SELECT USING (
    tenant_id IS NULL OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid OR
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- ── Seed: Built-in Policy Registry ────────────────────────────────────────

INSERT INTO autonomous.policy_registry (policy_id, name, type, conditions, autonomy_level, override_by) VALUES
  ('P-FIN-001', 'Small price adjustment (≤5%)', 'FINANCIAL', '{"action":"price_change","max_pct":5}', 'AGENT_APPROVED', '{"cfo","super_admin"}'),
  ('P-FIN-002', 'Medium price adjustment (5–15%)', 'FINANCIAL', '{"action":"price_change","min_pct":5,"max_pct":15}', 'AI_RECOMMENDED', '{"cfo"}'),
  ('P-FIN-003', 'Large price adjustment (>15%)', 'FINANCIAL', '{"action":"price_change","min_pct":15}', 'HUMAN_DECISION', '{}'),
  ('P-CON-001', 'Auto-publish quality listing', 'CONTENT', '{"action":"listing_publish","min_quality":0.75,"trust_pass":true}', 'AGENT_APPROVED', '{"super_admin"}'),
  ('P-CON-002', 'Auto-quarantine fraud listing', 'CONTENT', '{"action":"content_quarantine","min_fraud_score":0.70}', 'AUTONOMOUS_EXECUTION', '{"super_admin"}'),
  ('P-CON-003', 'Permanent listing removal', 'CONTENT', '{"action":"listing_remove"}', 'HUMAN_DECISION', '{}'),
  ('P-SEC-001', 'Auto-freeze fraudulent account', 'SECURITY', '{"action":"account_freeze","min_fraud_score":0.85}', 'AUTONOMOUS_EXECUTION', '{"super_admin"}'),
  ('P-SEC-002', 'Permanent account ban', 'SECURITY', '{"action":"account_ban"}', 'HUMAN_DECISION', '{}'),
  ('P-OPS-001', 'Auto-scale infrastructure', 'OPERATIONAL', '{"action":"auto_scale","min_cpu":80}', 'AUTONOMOUS_EXECUTION', '{"cto"}'),
  ('P-OPS-002', 'Major incident rollback', 'OPERATIONAL', '{"action":"incident_rollback","p0":true}', 'AI_RECOMMENDED', '{"cto","vp_engineering"}'),
  ('P-RET-001', 'Email save campaign (medium+ risk)', 'OPERATIONAL', '{"action":"save_campaign","min_risk_tier":"MEDIUM"}', 'AGENT_APPROVED', '{"vp_customer_success"}'),
  ('P-EXP-001', 'Expansion email sequence', 'OPERATIONAL', '{"action":"expansion_sequence","min_score":0.70}', 'AGENT_APPROVED', '{"vp_sales"}')
ON CONFLICT (policy_id) DO NOTHING;

-- ── Initial Autonomy Metrics Snapshot ─────────────────────────────────────

INSERT INTO autonomous.autonomy_metrics (
  autonomy_score, agent_utilization, automation_rate,
  revenue_impact_usd, cost_savings_usd, resolution_rate,
  trust_score_avg, risk_score, total_decisions, autonomous_decisions,
  autonomous_enterprise_index, maturity_level, active_agent_count
) VALUES (
  0.38, 0.28, 0.55,
  62000, 28000, 0.47,
  0.81, 0.19, 1921, 1784,
  47, 'LEVEL_2_AUGMENTED', 8
);

COMMENT ON SCHEMA autonomous IS 'Phase AU: Autonomous Enterprise — all agent activity, decisions, and metrics';
COMMENT ON TABLE autonomous.decision_logs IS 'Immutable audit trail of all agent decisions and their outcomes';
COMMENT ON TABLE autonomous.agent_activity IS 'Activity log for all autonomous agents across all workstreams';
COMMENT ON TABLE autonomous.autonomy_metrics IS 'Hourly snapshots of the 8 core Autonomous Enterprise KPIs';
COMMENT ON TABLE autonomous.knowledge_nodes IS 'Knowledge graph nodes for institutional memory and semantic search';
COMMENT ON TABLE autonomous.policy_registry IS 'Business rules governing agent autonomy levels per action type';
