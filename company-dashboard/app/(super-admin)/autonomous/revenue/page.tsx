'use client';

import React, { useState } from 'react';

const mockOverview = {
  total_tenants: 342, green: 280, yellow: 48, red: 14, avg_health_score: 72,
  upgrade_candidates: 23, downgrade_risks: 8, annual_conversion_ready: 15,
  mrr_at_risk: 8400, expansion_pipeline_mrr: 42600,
};

const mockPricingOpps = [
  { tier: 'Starter', current_price: 79, recommended_price: 83, change_pct: 5.06, price_elasticity: -1.2, confidence: 0.71, expected_mrr_impact: 3200, risk: 'LOW', autonomy_level: 'AI_RECOMMENDED' },
  { tier: 'Growth', current_price: 199, recommended_price: 199, change_pct: 0, price_elasticity: -1.8, confidence: 0.54, expected_mrr_impact: 0, risk: 'HIGH', autonomy_level: 'HUMAN_DECISION' },
  { tier: 'Enterprise', current_price: 599, recommended_price: 799, change_pct: 33.4, price_elasticity: -0.6, confidence: 0.62, expected_mrr_impact: 12000, risk: 'MEDIUM', autonomy_level: 'HUMAN_DECISION' },
];

const mockExpansionOpps = [
  { tenant_id: 'ten_acme', company_name: 'Acme Corp', current_plan: 'Growth', current_mrr: 199, expansion_score: 0.84, whitespace_features: ['Analytics Pro', 'API Access', 'White-label'], expected_arr_expansion: 28000, confidence: 0.78, autonomy_level: 'AGENT_APPROVED' },
  { tenant_id: 'ten_globex', company_name: 'Globex Industries', current_plan: 'Starter', current_mrr: 79, expansion_score: 0.76, whitespace_features: ['Multi-branch', 'Team management'], expected_arr_expansion: 14400, confidence: 0.71, autonomy_level: 'AGENT_APPROVED' },
];

const mockAtRisk = [
  { tenant_id: 'ten_delta', company_name: 'Delta Corp', plan: 'Growth', mrr: 199, health_score: 24, churn_probability: 0.78, recommended_action: 'Trigger urgent save campaign: executive outreach + 30-day extension offer', autonomy_level: 'AGENT_APPROVED' },
  { tenant_id: 'ten_sigma', company_name: 'Sigma Labs', plan: 'Starter', mrr: 79, health_score: 41, churn_probability: 0.62, recommended_action: 'Send onboarding re-engagement sequence', autonomy_level: 'AUTONOMOUS_EXECUTION' },
];

const levelColors: Record<string, string> = {
  AUTONOMOUS_EXECUTION: '#10B981',
  AGENT_APPROVED: '#3B82F6',
  AI_RECOMMENDED: '#F59E0B',
  HUMAN_DECISION: '#EF4444',
};

const riskColors: Record<string, string> = { LOW: '#10B981', MEDIUM: '#F59E0B', HIGH: '#EF4444' };

export default function RevenueAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'expansion' | 'retention'>('overview');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #10B981, #047857)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💰</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Revenue Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.2 · Pricing · Subscription · Expansion · Retention Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'Expansion Pipeline', value: `$${mockOverview.expansion_pipeline_mrr.toLocaleString()}`, color: '#10B981' },
            { label: 'MRR at Risk', value: `$${mockOverview.mrr_at_risk.toLocaleString()}`, color: '#EF4444' },
            { label: 'Avg Health Score', value: mockOverview.avg_health_score.toString(), color: '#3B82F6' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'overview', label: '📊 Revenue Overview' },
          { id: 'pricing', label: '🏷️ Pricing Agent' },
          { id: 'expansion', label: '🚀 Expansion Agent' },
          { id: 'retention', label: '🛡️ Retention Agent' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#10B981' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total Tenants', value: mockOverview.total_tenants.toLocaleString(), color: '#E8E8F0', icon: '🏢' },
            { label: 'Upgrade Candidates', value: mockOverview.upgrade_candidates.toString(), color: '#10B981', icon: '⭐' },
            { label: 'Annual Conversion Ready', value: mockOverview.annual_conversion_ready.toString(), color: '#3B82F6', icon: '📅' },
            { label: 'Downgrade Risks', value: mockOverview.downgrade_risks.toString(), color: '#EF4444', icon: '⚠️' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>{k.icon}</span>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mockPricingOpps.map(opp => (
            <div key={opp.tier} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 150px', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFF' }}>{opp.tier} Plan</span>
                  <span style={{ fontSize: '11px', color: riskColors[opp.risk], background: `${riskColors[opp.risk]}22`, padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>{opp.risk} RISK</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', color: '#9CA3AF', textDecoration: 'line-through' }}>${opp.current_price}</span>
                  <span style={{ fontSize: '16px', color: '#6B7280' }}>→</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>${opp.recommended_price}</span>
                  {opp.change_pct !== 0 && <span style={{ fontSize: '13px', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>+{opp.change_pct}%</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Price Elasticity</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#E8E8F0' }}>{opp.price_elasticity}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Expected MRR Impact</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: opp.expected_mrr_impact > 0 ? '#10B981' : '#6B7280' }}>+${opp.expected_mrr_impact.toLocaleString()}</div>
              </div>
              <div>
                 <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Autonomy Level</div>
                 <span style={{ fontSize: '11px', fontWeight: 600, color: levelColors[opp.autonomy_level], background: `${levelColors[opp.autonomy_level]}22`, padding: '4px 8px', borderRadius: '6px' }}>{opp.autonomy_level.replace('_', ' ')}</span>
              </div>
              <button disabled={opp.autonomy_level === 'HUMAN_DECISION'} style={{ padding: '10px', background: opp.autonomy_level === 'HUMAN_DECISION' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10B981, #059669)', color: opp.autonomy_level === 'HUMAN_DECISION' ? '#6B7280' : '#FFF', border: 'none', borderRadius: '8px', cursor: opp.autonomy_level === 'HUMAN_DECISION' ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Execute</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'expansion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mockExpansionOpps.map(opp => (
            <div key={opp.tenant_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 150px', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{opp.company_name}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>({opp.current_plan})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${opp.expansion_score * 100}%`, background: '#3B82F6', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>Score: {(opp.expansion_score * 100).toFixed(0)}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Whitespace Opportunity</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {opp.whitespace_features.map(f => <span key={f} style={{ fontSize: '11px', color: '#D1D5DB', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>{f}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Expected ARR</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>+${opp.expected_arr_expansion.toLocaleString()}</div>
              </div>
              <button style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Trigger Sequence</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'retention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mockAtRisk.map(risk => (
            <div key={risk.tenant_id} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 150px', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{risk.company_name}</span>
                  <span style={{ fontSize: '12px', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>AT RISK (${risk.mrr}/mo)</span>
                </div>
                <div style={{ fontSize: '13px', color: '#D1D5DB' }}>Health Score: <span style={{ color: '#EF4444', fontWeight: 700 }}>{risk.health_score}</span> / 100</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Churn Probability</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#EF4444' }}>{(risk.churn_probability * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Action</div>
                <div style={{ fontSize: '13px', color: '#E8E8F0' }}>{risk.recommended_action}</div>
              </div>
              <button style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Execute Save</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
