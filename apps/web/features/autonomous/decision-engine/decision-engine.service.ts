/**
 * Decision Engine Service — AU.8 Decision Automation
 * Routes agent actions through policy evaluation and risk scoring.
 */

export type AutonomyLevel =
  | 'AUTONOMOUS_EXECUTION'
  | 'AGENT_APPROVED'
  | 'AI_RECOMMENDED'
  | 'HUMAN_DECISION'
  | 'BOARD_DECISION';

export type ActionType =
  | 'price_change' | 'listing_publish' | 'listing_remove'
  | 'account_freeze' | 'account_ban' | 'save_campaign'
  | 'expansion_sequence' | 'annual_offer' | 'upgrade_nudge'
  | 'index_rebuild' | 'auto_scale' | 'incident_rollback'
  | 'content_quarantine' | 'trust_score_update' | 'fraud_flag';

export interface DecisionRequest {
  decision_id?: string;
  agent_id: string;
  action_type: ActionType;
  target_entity_id: string;
  target_entity_type: 'tenant' | 'listing' | 'user' | 'platform' | 'campaign';
  expected_impact: {
    revenue_usd?: number;
    risk_delta?: number;
    users_affected?: number;
  };
  context: Record<string, unknown>;
}

export interface DecisionResult {
  decision_id: string;
  request: DecisionRequest;
  autonomy_level: AutonomyLevel;
  policy_matched: string | null;
  risk_score: number;
  approved: boolean;
  approved_by: string | null;
  reasoning: string;
  next_action: 'EXECUTE' | 'QUEUE_FOR_APPROVAL' | 'REJECT';
  created_at: string;
}

export interface DecisionLog {
  decision_id: string;
  agent_id: string;
  action_type: ActionType;
  autonomy_level: AutonomyLevel;
  approved: boolean;
  risk_score: number;
  expected_impact_usd: number | null;
  actual_impact_usd: number | null;
  created_at: string;
  outcome_status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
}

// Policy lookup table (in production, loaded from autonomous.policy_registry)
const POLICY_TABLE: Record<string, { autonomy_level: AutonomyLevel; condition: (req: DecisionRequest) => boolean }> = {
  'P-FIN-001': {
    autonomy_level: 'AGENT_APPROVED',
    condition: (r) => r.action_type === 'price_change' && (r.context.price_change_pct as number) <= 5,
  },
  'P-FIN-002': {
    autonomy_level: 'AI_RECOMMENDED',
    condition: (r) => r.action_type === 'price_change' && (r.context.price_change_pct as number) > 5,
  },
  'P-CON-001': {
    autonomy_level: 'AGENT_APPROVED',
    condition: (r) => r.action_type === 'listing_publish' && (r.context.quality_score as number) > 0.75,
  },
  'P-CON-002': {
    autonomy_level: 'AUTONOMOUS_EXECUTION',
    condition: (r) => r.action_type === 'content_quarantine' && (r.context.fraud_score as number) > 0.70,
  },
  'P-CON-003': {
    autonomy_level: 'HUMAN_DECISION',
    condition: (r) => r.action_type === 'listing_remove',
  },
  'P-SEC-001': {
    autonomy_level: 'AUTONOMOUS_EXECUTION',
    condition: (r) => r.action_type === 'account_freeze' && ((r.context.fraud_score as number) > 0.85 || (r.context.chargebacks as number) > 3),
  },
  'P-SEC-002': {
    autonomy_level: 'HUMAN_DECISION',
    condition: (r) => r.action_type === 'account_ban',
  },
  'P-OPS-001': {
    autonomy_level: 'AUTONOMOUS_EXECUTION',
    condition: (r) => r.action_type === 'auto_scale' && (r.context.cpu_utilization as number) > 80,
  },
  'P-RET-001': {
    autonomy_level: 'AGENT_APPROVED',
    condition: (r) => r.action_type === 'save_campaign',
  },
  'P-EXP-001': {
    autonomy_level: 'AGENT_APPROVED',
    condition: (r) => r.action_type === 'expansion_sequence',
  },
};

function computeRiskScore(req: DecisionRequest): number {
  const financialExposure = Math.log10(Math.max(req.expected_impact.revenue_usd ?? 1, 1)) / 10;
  const blastRadius = Math.min((req.expected_impact.users_affected ?? 0) / 10_000, 1);
  const irreversibleActions: ActionType[] = ['account_ban', 'listing_remove'];
  const reversibility = irreversibleActions.includes(req.action_type) ? 0.5 : 0;

  return Math.min(financialExposure + blastRadius * 0.3 + reversibility, 1.0);
}

function escalateByRiskScore(score: number): AutonomyLevel {
  if (score < 0.20) return 'AUTONOMOUS_EXECUTION';
  if (score < 0.40) return 'AGENT_APPROVED';
  if (score < 0.65) return 'AI_RECOMMENDED';
  if (score < 0.85) return 'HUMAN_DECISION';
  return 'BOARD_DECISION';
}

class DecisionEngineServiceImpl {
  private decisionLog: DecisionLog[] = [];

  async evaluate(request: DecisionRequest): Promise<DecisionResult> {
    const decision_id = request.decision_id ?? `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const risk_score = computeRiskScore(request);

    // Find matching policy
    let policy_matched: string | null = null;
    let policyLevel: AutonomyLevel | null = null;
    for (const [policyId, policy] of Object.entries(POLICY_TABLE)) {
      if (policy.condition(request)) {
        policy_matched = policyId;
        policyLevel = policy.autonomy_level;
        break;
      }
    }

    // Take the more restrictive of policy level and risk-based level
    const riskLevel = escalateByRiskScore(risk_score);
    const levelOrder: AutonomyLevel[] = [
      'AUTONOMOUS_EXECUTION', 'AGENT_APPROVED', 'AI_RECOMMENDED', 'HUMAN_DECISION', 'BOARD_DECISION',
    ];
    const policyIdx = policyLevel ? levelOrder.indexOf(policyLevel) : 0;
    const riskIdx = levelOrder.indexOf(riskLevel);
    const autonomy_level = levelOrder[Math.max(policyIdx, riskIdx)];

    const approved = autonomy_level === 'AUTONOMOUS_EXECUTION' || autonomy_level === 'AGENT_APPROVED';
    const next_action: DecisionResult['next_action'] =
      approved ? 'EXECUTE' :
      autonomy_level === 'HUMAN_DECISION' || autonomy_level === 'BOARD_DECISION' ? 'QUEUE_FOR_APPROVAL' :
      'QUEUE_FOR_APPROVAL';

    const result: DecisionResult = {
      decision_id,
      request,
      autonomy_level,
      policy_matched,
      risk_score: Math.round(risk_score * 10000) / 10000,
      approved,
      approved_by: approved ? 'system' : null,
      reasoning: `Policy: ${policy_matched ?? 'none'}. Risk score: ${risk_score.toFixed(3)}. Autonomy level: ${autonomy_level}.`,
      next_action,
      created_at: new Date().toISOString(),
    };

    // Append to in-memory log (production: insert to autonomous.decision_logs)
    this.decisionLog.push({
      decision_id,
      agent_id: request.agent_id,
      action_type: request.action_type,
      autonomy_level,
      approved,
      risk_score: result.risk_score,
      expected_impact_usd: request.expected_impact.revenue_usd ?? null,
      actual_impact_usd: null,
      created_at: result.created_at,
      outcome_status: 'PENDING',
    });

    return result;
  }

  async getDecisionHistory(limit = 50): Promise<DecisionLog[]> {
    return this.decisionLog.slice(-limit).reverse();
  }

  async getDecisionStats(): Promise<{
    total: number;
    by_level: Record<AutonomyLevel, number>;
    autonomy_score: number;
    avg_risk_score: number;
  }> {
    const total = this.decisionLog.length;
    const by_level = this.decisionLog.reduce((acc, d) => {
      acc[d.autonomy_level] = (acc[d.autonomy_level] ?? 0) + 1;
      return acc;
    }, {} as Record<AutonomyLevel, number>);

    const autonomous = (by_level['AUTONOMOUS_EXECUTION'] ?? 0) + (by_level['AGENT_APPROVED'] ?? 0);
    const autonomy_score = total > 0 ? autonomous / total : 0;
    const avg_risk_score = total > 0
      ? this.decisionLog.reduce((sum, d) => sum + d.risk_score, 0) / total
      : 0;

    return { total, by_level, autonomy_score, avg_risk_score };
  }
}

export const DecisionEngineService = new DecisionEngineServiceImpl();
