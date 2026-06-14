'use client';

import React, { useState } from 'react';

const mockApprovals = [
  { approval_id: 'apr_001', autonomy_level: 'AI_RECOMMENDED', action_type: 'PRICE_CHANGE', agent_id: 'pricing-agent', expected_impact_usd: 3200, status: 'PENDING', deadline: new Date(Date.now() + 3600000 * 4).toISOString() },
  { approval_id: 'apr_002', autonomy_level: 'AGENT_APPROVED', action_type: 'SAVE_CAMPAIGN', agent_id: 'retention-agent', expected_impact_usd: 2388, status: 'PENDING', deadline: new Date(Date.now() + 3600000 * 2).toISOString() },
];

const mockPolicies = [
  { policy_id: 'P-FIN-001', name: 'Small price adjustment (≤5%)', type: 'FINANCIAL', autonomy_level: 'AGENT_APPROVED', active: true },
  { policy_id: 'P-FIN-002', name: 'Medium price adjustment (5–15%)', type: 'FINANCIAL', autonomy_level: 'AI_RECOMMENDED', active: true },
  { policy_id: 'P-CON-001', name: 'Auto-publish quality listing', type: 'CONTENT', autonomy_level: 'AGENT_APPROVED', active: true },
  { policy_id: 'P-SEC-001', name: 'Auto-freeze fraudulent account', type: 'SECURITY', autonomy_level: 'AUTONOMOUS_EXECUTION', active: true },
];

const mockRisk = {
  composite_risk_score: 0.19,
  severity_breakdown: { LOW: 12, MEDIUM: 4, HIGH: 1, CRITICAL: 0 },
  top_risks: [
    { factor: 'Vector Search SLO burn rate elevated', score: 0.42, trend: 'increasing' },
    { factor: 'Competitor A pricing pressure on Starter segment', score: 0.38, trend: 'stable' },
  ],
};

const levelColors: Record<string, string> = {
  AUTONOMOUS_EXECUTION: '#10B981',
  AGENT_APPROVED: '#3B82F6',
  AI_RECOMMENDED: '#F59E0B',
  HUMAN_DECISION: '#EF4444',
};

export default function AutonomyCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'policies' | 'risk'>('approvals');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #EC4899, #BE185D)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚡</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Autonomy Command Center</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.8 · Approval Engine · Policy Engine · Risk Engine</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'approvals', label: '✅ Pending Approvals' },
          { id: 'policies', label: '📜 Policy Matrix' },
          { id: 'risk', label: '⚠️ Risk Engine' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#EC4899' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mockApprovals.map(app => (
            <div key={app.approval_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 200px', alignItems: 'center', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#FFF' }}>{app.action_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{app.agent_id}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#9CA3AF' }}>Deadline: {new Date(app.deadline).toLocaleTimeString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Expected Impact</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>+${app.expected_impact_usd.toLocaleString()}</div>
              </div>
              <div>
                 <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Autonomy Level</div>
                 <span style={{ fontSize: '11px', fontWeight: 600, color: levelColors[app.autonomy_level], background: `${levelColors[app.autonomy_level]}22`, padding: '4px 8px', borderRadius: '6px' }}>{app.autonomy_level.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                <button style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'policies' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Policy ID', 'Name', 'Domain', 'Autonomy Level', 'Status'].map(h => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockPolicies.map(pol => (
                <tr key={pol.policy_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#9CA3AF' }}>{pol.policy_id}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#E8E8F0' }}>{pol.name}</td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#D1D5DB' }}>{pol.type}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: `${levelColors[pol.autonomy_level]}22`, color: levelColors[pol.autonomy_level], borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}>{pol.autonomy_level.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ color: pol.active ? '#10B981' : '#6B7280', fontSize: '13px', fontWeight: 600 }}>{pol.active ? 'ACTIVE' : 'INACTIVE'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'risk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Composite Risk Score</div>
            <div style={{ fontSize: '64px', fontWeight: 900, color: '#10B981' }}>{(mockRisk.composite_risk_score * 100).toFixed(0)}</div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Out of 100 (Lower is better)</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>Top Risk Factors</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockRisk.top_risks.map((risk, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: i < mockRisk.top_risks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: '14px', color: '#E8E8F0' }}>{risk.factor}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B' }}>{(risk.score * 100).toFixed(0)}</span>
                    <span style={{ fontSize: '12px', color: risk.trend === 'increasing' ? '#EF4444' : '#6B7280' }}>{risk.trend === 'increasing' ? '↑' : '→'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
