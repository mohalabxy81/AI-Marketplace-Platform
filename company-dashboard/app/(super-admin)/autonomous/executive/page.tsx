'use client';

import React, { useState } from 'react';

const mockCompanyMetrics = {
  arr_usd: 12450000, arr_growth_yoy: 0.84,
  cash_runway_months: 24, burn_rate_monthly: -420000,
  gross_margin: 0.82, ndr: 1.14,
  cac_payback_months: 8,
  enterprise_value_est: 180000000,
};

const mockStrategicMoves = [
  { move_id: 'strat_001', title: 'Pivot Marketing Spend to Enterprise Segment', logic: 'Enterprise NDR is 1.32 vs SMB 0.94. CAC Payback is 11mo vs 6mo but LTV/CAC is 8.4x vs 3.1x.', confidence: 0.88, impact_arr: 1200000, status: 'AI_RECOMMENDED' },
  { move_id: 'strat_002', title: 'Sunset "Basic" Tier for New Signups', logic: 'Basic tier accounts for 42% of support tickets but only 12% of revenue. 64% of Basic users would likely upgrade to Starter if Basic was unavailable.', confidence: 0.74, impact_arr: 340000, status: 'HUMAN_DECISION' },
];

const mockFinancialAnomalies = [
  { anomaly_id: 'ano_001', category: 'COGS', description: 'Vector Database spend spiked 42% week-over-week.', agent_action: 'Operations Agent notified to optimize HNSW index rebuilds.', impact_usd: -12400, resolved: true },
  { anomaly_id: 'ano_002', category: 'REVENUE', description: 'Expansion MRR dropped 18% in EMEA region.', agent_action: 'Growth Agent triggered targeted expansion sequence for EMEA.', impact_usd: -8400, resolved: false },
];

export default function ExecutiveAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'ceo' | 'cfo' | 'strategy'>('ceo');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #0D9488, #115E59)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👔</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Executive Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.1 · CEO Copilot · CFO Copilot · Strategy Agent</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'ARR', value: `$${(mockCompanyMetrics.arr_usd / 1000000).toFixed(1)}M`, color: '#0D9488' },
            { label: 'Runway', value: `${mockCompanyMetrics.cash_runway_months}mo`, color: '#10B981' },
            { label: 'NDR', value: `${(mockCompanyMetrics.ndr * 100).toFixed(0)}%`, color: '#3B82F6' },
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
          { id: 'ceo', label: '👑 CEO Overview' },
          { id: 'cfo', label: '📈 CFO Copilot' },
          { id: 'strategy', label: '♟️ Strategy Agent' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#0D9488' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ceo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Total ARR', value: `$${(mockCompanyMetrics.arr_usd / 1000000).toFixed(2)}M`, color: '#0D9488', sub: `+${(mockCompanyMetrics.arr_growth_yoy * 100).toFixed(0)}% YoY` },
            { label: 'Net Dollar Retention', value: `${(mockCompanyMetrics.ndr * 100).toFixed(0)}%`, color: '#10B981', sub: 'World-class: >120%' },
            { label: 'Gross Margin', value: `${(mockCompanyMetrics.gross_margin * 100).toFixed(0)}%`, color: '#3B82F6', sub: 'Target: 85%' },
            { label: 'Est. Enterprise Value', value: `$${(mockCompanyMetrics.enterprise_value_est / 1000000).toFixed(0)}M`, color: '#F59E0B', sub: 'Based on 14.4x ARR multiple' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: k.color, marginBottom: '8px' }}>{k.value}</div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '11px', color: '#4B5563' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'cfo' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
             <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
               <div style={{ fontSize: '36px', fontWeight: 800, color: '#EF4444' }}>${(Math.abs(mockCompanyMetrics.burn_rate_monthly) / 1000).toFixed(0)}k</div>
               <div style={{ fontSize: '12px', color: '#6B7280' }}>Monthly Burn Rate</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
               <div style={{ fontSize: '36px', fontWeight: 800, color: '#10B981' }}>{mockCompanyMetrics.cash_runway_months}mo</div>
               <div style={{ fontSize: '12px', color: '#6B7280' }}>Cash Runway</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
               <div style={{ fontSize: '36px', fontWeight: 800, color: '#3B82F6' }}>{mockCompanyMetrics.cac_payback_months}mo</div>
               <div style={{ fontSize: '12px', color: '#6B7280' }}>CAC Payback Period</div>
             </div>
          </div>
          <h3 style={{ fontSize: '14px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Financial Anomalies Detected</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockFinancialAnomalies.map(ano => (
              <div key={ano.anomaly_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <div style={{ background: ano.resolved ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ano.resolved ? '#10B981' : '#EF4444', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{ano.category}</div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: '14px', color: '#E8E8F0', marginBottom: '4px' }}>{ano.description}</div>
                   <div style={{ fontSize: '12px', color: '#6B7280' }}>Agent Action: {ano.agent_action}</div>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '16px', fontWeight: 700, color: '#EF4444' }}>${Math.abs(ano.impact_usd).toLocaleString()}</div>
                   <div style={{ fontSize: '11px', color: ano.resolved ? '#10B981' : '#F59E0B' }}>{ano.resolved ? 'Resolved' : 'Action Pending'}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           {mockStrategicMoves.map(move => (
             <div key={move.move_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <span style={{ fontSize: '18px', fontWeight: 700, color: '#FFF' }}>{move.title}</span>
                   <span style={{ fontSize: '11px', color: move.status === 'AI_RECOMMENDED' ? '#F59E0B' : '#EF4444', background: move.status === 'AI_RECOMMENDED' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>{move.status.replace('_', ' ')}</span>
                 </div>
                 <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>+${(move.impact_arr / 1000).toFixed(0)}k ARR</div>
               </div>
               <div style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.6, marginBottom: '20px' }}>
                 <strong style={{ color: '#9CA3AF' }}>Strategic Logic:</strong> {move.logic}
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                 <div style={{ fontSize: '12px', color: '#6B7280' }}>Agent Confidence: <span style={{ color: '#0D9488', fontWeight: 700 }}>{(move.confidence * 100).toFixed(0)}%</span></div>
                 <button style={{ marginLeft: 'auto', padding: '10px 24px', background: 'rgba(13,148,136,0.1)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Review Data Room</button>
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
