# Spec 51 — STEP AU.8: Decision Automation Engine

> **Phase**: AU.8 | **Scope**: Decision Engine · Approval Engine · Policy Engine · Risk Engine

---

## 1. Decision Automation Architecture

The Decision Automation Engine is the governance backbone of the Autonomous Enterprise. Every agent action passes through this engine, which evaluates the autonomy level, applies policy rules, routes for approval if needed, and logs the decision for audit.

```
         [Agent Action Request]
                  │
                  ▼
         ┌────────────────────┐
         │   Policy Engine    │ ← applies business rules
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │    Risk Engine     │ ← computes action risk score
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Decision Router   │ ← assigns autonomy level
         └────────┬───────────┘
                  │
         ┌────────┴────────────────────┐
         ▼        ▼         ▼          ▼
  [AUTONOMOUS] [AGENT_  [AI_RECOM- [HUMAN_
  [EXECUTION]  APPROVED] MENDED]    DECISION]
                  │         │          │
                  ▼         ▼          ▼
            [Auto-exec] [Approval  [Human
                         Queue]     Dashboard]
```

---

## 2. Autonomy Level Taxonomy

```typescript
type AutonomyLevel =
  | 'AUTONOMOUS_EXECUTION'  // Agent acts, logs only, no approval
  | 'AGENT_APPROVED'        // Agent acts within pre-approved policy bounds
  | 'AI_RECOMMENDED'        // Agent recommends, human reviews + approves
  | 'HUMAN_DECISION'        // Agent surfaces, human decides fully
  | 'BOARD_DECISION';       // Highest impact, Board-level approval

interface DecisionRequest {
  decision_id: string;
  agent_id: string;
  action_type: ActionType;
  target_entity_id: string;
  target_entity_type: 'tenant' | 'listing' | 'user' | 'pricing' | 'campaign';
  expected_impact: {
    revenue_usd?: number;
    risk_delta?: number;
    users_affected?: number;
  };
  context: Record<string, unknown>;
  requested_at: string;
}

interface DecisionResult {
  decision_id: string;
  autonomy_level: AutonomyLevel;
  policy_result: PolicyResult;
  risk_score: number;
  approved: boolean;
  approved_by?: string;           // human approver ID or 'system'
  approval_latency_ms?: number;
  executed_at?: string;
  outcome?: ActionOutcome;
}
```

---

## 3. Policy Engine

**Mission**: Evaluate all agent action requests against the platform's policy registry to determine permissibility and required autonomy level.

**Policy Types**:
```typescript
type PolicyType =
  | 'FINANCIAL'       // Revenue, pricing, billing decisions
  | 'CONTENT'         // Listing moderation, publishing decisions
  | 'SECURITY'        // Account actions, access changes
  | 'OPERATIONAL'     // Infrastructure, SRE actions
  | 'COMPLIANCE'      // Regulatory, legal decisions
  | 'REPUTATIONAL';   // Trust, brand actions

interface Policy {
  policy_id: string;
  name: string;
  type: PolicyType;
  conditions: PolicyCondition[];     // evaluated as AND
  autonomy_level: AutonomyLevel;     // required level if conditions match
  override_by: string[];             // roles that can override
  effective_from: string;
  effective_until?: string;
  last_reviewed: string;
}
```

**Built-in Policy Registry**:
| Policy ID | Description | Conditions | Autonomy Level |
|-----------|-------------|------------|---------------|
| `P-FIN-001` | Small price adjustment | `price_change_pct <= 5` | `AGENT_APPROVED` |
| `P-FIN-002` | Medium price adjustment | `5 < price_change_pct <= 15` | `AI_RECOMMENDED` |
| `P-FIN-003` | Large price adjustment | `price_change_pct > 15` | `HUMAN_DECISION` |
| `P-FIN-004` | Custom contract offer | `contract_type = 'custom'` | `HUMAN_DECISION` |
| `P-CON-001` | Auto-publish listing | `quality_score > 0.75 AND trust_pass = true` | `AGENT_APPROVED` |
| `P-CON-002` | Quarantine listing | `fraud_score > 0.70` | `AUTONOMOUS_EXECUTION` |
| `P-CON-003` | Permanent listing removal | any | `HUMAN_DECISION` |
| `P-SEC-001` | Account freeze | `fraud_score > 0.85 OR chargebacks > 3` | `AUTONOMOUS_EXECUTION` |
| `P-SEC-002` | Permanent account ban | any | `HUMAN_DECISION` |
| `P-OPS-001` | Auto-scale infrastructure | `cpu_utilization > 80%` | `AUTONOMOUS_EXECUTION` |
| `P-OPS-002` | Major incident rollback | `p0_incident = true` | `AI_RECOMMENDED` |
| `P-RET-001` | Email save campaign | `churn_risk >= MEDIUM` | `AGENT_APPROVED` |
| `P-EXP-001` | Expansion email sequence | `expansion_score > 0.70` | `AGENT_APPROVED` |
| `P-EXP-002` | Custom pricing for expansion | any | `AI_RECOMMENDED` |

---

## 4. Risk Engine

**Mission**: Compute a real-time risk score for every proposed agent action.

**Risk Scoring Model**:
```typescript
interface RiskFactors {
  financial_exposure_usd: number;     // direct financial impact
  users_affected_count: number;       // blast radius (users impacted)
  reversibility: 'REVERSIBLE' | 'PARTIALLY_REVERSIBLE' | 'IRREVERSIBLE';
  regulatory_surface: boolean;        // touches compliance domains
  brand_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  data_privacy_risk: boolean;         // involves PII or sensitive data
  precedent_exists: boolean;          // has this action type been done before?
}

function computeRiskScore(factors: RiskFactors): number {
  const base = Math.log10(Math.max(factors.financial_exposure_usd, 1)) / 10;
  const blastRadius = Math.min(factors.users_affected_count / 10000, 1);
  const reversibility = { REVERSIBLE: 0, PARTIALLY_REVERSIBLE: 0.3, IRREVERSIBLE: 0.7 }[factors.reversibility];
  const regulatory = factors.regulatory_surface ? 0.2 : 0;
  const brand = { LOW: 0, MEDIUM: 0.1, HIGH: 0.3 }[factors.brand_risk];
  const privacy = factors.data_privacy_risk ? 0.15 : 0;
  const precedent = factors.precedent_exists ? -0.1 : 0.1;

  return Math.min(base + blastRadius * 0.3 + reversibility + regulatory + brand + privacy + precedent, 1.0);
}
// Risk Score → Autonomy Level escalation:
// 0.00 – 0.20: AUTONOMOUS_EXECUTION allowed
// 0.20 – 0.40: AGENT_APPROVED required
// 0.40 – 0.65: AI_RECOMMENDED required
// 0.65 – 0.85: HUMAN_DECISION required
// 0.85+:       BOARD_DECISION required
```

---

## 5. Approval Engine

**Mission**: Route non-autonomous decisions to the correct human approver with context, deadline, and escalation logic.

**Approval Queue Schema**:
```typescript
interface ApprovalRequest {
  approval_id: string;
  decision_id: string;
  autonomy_level: AutonomyLevel;
  required_approver_role: string;
  fallback_approver_role?: string;   // if primary doesn't approve in time
  deadline: string;                  // ISO timestamp
  escalation_after_ms: number;       // auto-escalate after this delay
  context: {
    agent_id: string;
    action_description: string;
    expected_impact: string;
    risk_score: number;
    policy_matched: string;
    supporting_data: Record<string, unknown>;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'EXPIRED';
}
```

**Approval SLAs**:
| Autonomy Level | Primary Approver | SLA | Escalation To |
|---------------|-----------------|-----|--------------|
| `AI_RECOMMENDED` | Department Head | 4h | VP level |
| `HUMAN_DECISION` | VP level | 24h | C-Suite |
| `BOARD_DECISION` | CEO | 72h | Full Board |

---

## 6. Database Schema

```sql
-- Schema: autonomous
CREATE SCHEMA IF NOT EXISTS autonomous;

-- Decision Log (immutable, append-only)
CREATE TABLE autonomous.decision_logs (
  decision_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  target_entity_id    UUID,
  target_entity_type  TEXT,
  autonomy_level      TEXT NOT NULL CHECK (autonomy_level IN (
    'AUTONOMOUS_EXECUTION','AGENT_APPROVED','AI_RECOMMENDED','HUMAN_DECISION','BOARD_DECISION'
  )),
  policy_id           TEXT REFERENCES autonomous.policy_registry(policy_id),
  risk_score          NUMERIC(5,4) NOT NULL,
  approved            BOOLEAN NOT NULL DEFAULT false,
  approved_by         TEXT,
  expected_impact_usd NUMERIC(12,2),
  actual_impact_usd   NUMERIC(12,2),
  context             JSONB,
  outcome             JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

-- Agent Activity Registry
CREATE TABLE autonomous.agent_activity (
  activity_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL,
  agent_type          TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  target_tenant_id    UUID,
  status              TEXT NOT NULL DEFAULT 'pending',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INTEGER,
  tokens_used         INTEGER,
  expected_impact_usd NUMERIC(12,2),
  actual_impact_usd   NUMERIC(12,2),
  outcome_status      TEXT,
  error_message       TEXT,
  metadata            JSONB
);

-- Autonomy Metrics (hourly snapshots)
CREATE TABLE autonomous.autonomy_metrics (
  metric_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autonomy_score      NUMERIC(5,4),
  agent_utilization   NUMERIC(5,4),
  automation_rate     NUMERIC(5,4),
  revenue_impact_usd  NUMERIC(12,2),
  cost_savings_usd    NUMERIC(12,2),
  resolution_rate     NUMERIC(5,4),
  trust_score_avg     NUMERIC(5,4),
  risk_score          NUMERIC(5,4),
  total_decisions     INTEGER,
  autonomous_decisions INTEGER,
  agent_hours         NUMERIC(8,2)
);

-- Policy Registry
CREATE TABLE autonomous.policy_registry (
  policy_id           TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL,
  conditions          JSONB NOT NULL,
  autonomy_level      TEXT NOT NULL,
  override_by         TEXT[] DEFAULT '{}',
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until     TIMESTAMPTZ,
  last_reviewed       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active              BOOLEAN NOT NULL DEFAULT true
);

-- Knowledge Graph Nodes
CREATE TABLE autonomous.knowledge_nodes (
  node_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type           TEXT NOT NULL,  -- 'concept','entity','fact','procedure'
  content             TEXT NOT NULL,
  embedding           VECTOR(1536),
  metadata            JSONB,
  tenant_id           UUID,           -- NULL = platform-wide knowledge
  source_agent        TEXT,
  confidence          NUMERIC(3,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count        INTEGER DEFAULT 0
);

-- Knowledge Graph Edges
CREATE TABLE autonomous.knowledge_edges (
  edge_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id      UUID NOT NULL REFERENCES autonomous.knowledge_nodes(node_id),
  target_node_id      UUID NOT NULL REFERENCES autonomous.knowledge_nodes(node_id),
  relationship_type   TEXT NOT NULL,  -- 'relates_to','causes','requires','contradicts'
  weight              NUMERIC(3,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk Scores
CREATE TABLE autonomous.risk_scores (
  score_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         TEXT NOT NULL,  -- 'platform','tenant','agent','decision'
  entity_id           TEXT,
  risk_score          NUMERIC(5,4) NOT NULL,
  risk_factors        JSONB NOT NULL,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until         TIMESTAMPTZ,
  alert_triggered     BOOLEAN DEFAULT false
);

-- Approval Requests
CREATE TABLE autonomous.approval_requests (
  approval_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id         UUID REFERENCES autonomous.decision_logs(decision_id),
  autonomy_level      TEXT NOT NULL,
  required_role       TEXT NOT NULL,
  fallback_role       TEXT,
  deadline            TIMESTAMPTZ NOT NULL,
  escalation_after_ms INTEGER NOT NULL DEFAULT 14400000, -- 4h
  context             JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'PENDING',
  approved_by         TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_decision_logs_agent ON autonomous.decision_logs(agent_id, created_at DESC);
CREATE INDEX idx_decision_logs_tenant ON autonomous.decision_logs(target_entity_id, created_at DESC);
CREATE INDEX idx_agent_activity_tenant ON autonomous.agent_activity(target_tenant_id, started_at DESC);
CREATE INDEX idx_autonomy_metrics_time ON autonomous.autonomy_metrics(snapshot_at DESC);
CREATE INDEX idx_knowledge_nodes_embedding ON autonomous.knowledge_nodes USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_risk_scores_entity ON autonomous.risk_scores(entity_type, entity_id, computed_at DESC);
CREATE INDEX idx_approval_requests_status ON autonomous.approval_requests(status, deadline);

-- Row Level Security
ALTER TABLE autonomous.decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.approval_requests ENABLE ROW LEVEL SECURITY;

-- Super admin can see all
CREATE POLICY super_admin_all ON autonomous.decision_logs
  USING (auth.jwt() ->> 'role' = 'super_admin');
CREATE POLICY super_admin_all_activity ON autonomous.agent_activity
  USING (auth.jwt() ->> 'role' = 'super_admin');
```

---

## 7. Service Contracts

```typescript
interface DecisionEngineService {
  evaluate(request: DecisionRequest): Promise<DecisionResult>;
  getDecisionHistory(filters: DecisionFilters): Promise<DecisionLog[]>;
  overrideDecision(decision_id: string, override: DecisionOverride): Promise<void>;
}

interface ApprovalEngineService {
  createApprovalRequest(decision: DecisionResult): Promise<ApprovalRequest>;
  approveDecision(approval_id: string, approver: string): Promise<void>;
  rejectDecision(approval_id: string, reason: string): Promise<void>;
  getPendingApprovals(role: string): Promise<ApprovalRequest[]>;
  checkEscalations(): Promise<EscalationResult[]>;
}

interface PolicyEngineService {
  evaluateAction(action: AgentAction): Promise<PolicyResult>;
  getApplicablePolicies(action_type: string): Promise<Policy[]>;
  createPolicy(policy: PolicyDraft): Promise<Policy>;
  updatePolicy(policy_id: string, updates: Partial<Policy>): Promise<Policy>;
}

interface RiskEngineService {
  computeActionRisk(action: AgentAction): Promise<number>;
  getPlatformRiskScore(): Promise<RiskScore>;
  getTenantRiskScore(tenant_id: string): Promise<RiskScore>;
  getConcentrationRisks(): Promise<ConcentrationRisk[]>;
}
```
