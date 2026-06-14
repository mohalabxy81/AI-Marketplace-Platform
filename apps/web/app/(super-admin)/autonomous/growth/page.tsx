/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import {
  GrowthAgentService,
  CampaignAgentService,
  SEOAgentService,
  AcquisitionAgentService,
} from '@/features/autonomous/growth';

const statusColors: Record<string, string> = {
  HEALTHY: '#00E5A0',
  WATCH: '#F59E0B',
  BOTTLENECK: '#EF4444',
  ACTIVE: '#00E5A0',
  PAUSED: '#6B7280',
  COMPLETED: '#3B82F6',
};

const levelColors: Record<string, string> = {
  AUTONOMOUS_EXECUTION: '#00E5A0',
  AGENT_APPROVED: '#3B82F6',
  AI_RECOMMENDED: '#F59E0B',
  HUMAN_DECISION: '#EF4444',
};

const mockGrowth = {
  organic_traffic_growth_mom: 0.12,
  trial_start_rate: 0.031,
  trial_to_paid: 0.22,
  viral_coefficient: 0.28,
  cac_blended: 820,
  payback_months: 10,
  growth_score: 64,
};

const mockFunnel = {
  top_bottleneck: 'Interest→Trial',
  recommended_intervention: 'Campaign Agent: retargeting sequence for interest-stage visitors + landing page CTA optimization',
  funnel: [
    { stage: 'Awareness→Interest', visitors: 12400, conversion_rate: 0.042, baseline: 0.038, z_score: 0.8, status: 'HEALTHY', recommended_action: 'Maintain current approach' },
    { stage: 'Interest→Trial', visitors: 521, conversion_rate: 0.031, baseline: 0.041, z_score: 2.4, status: 'BOTTLENECK', recommended_action: 'CTA optimization + retargeting' },
    { stage: 'Trial→Activation', visitors: 161, conversion_rate: 0.58, baseline: 0.60, z_score: 0.5, status: 'HEALTHY', recommended_action: 'Maintain' },
    { stage: 'Activation→Purchase', visitors: 93, conversion_rate: 0.22, baseline: 0.25, z_score: 1.1, status: 'WATCH', recommended_action: 'Reduce friction in checkout' },
  ],
};

const mockCampaigns = [
  { campaign_id: 'camp_q3_onboarding', name: 'Q3 Onboarding Re-engagement', type: 'email_drip', status: 'ACTIVE', recipients: 234, open_rate: 0.41, click_rate: 0.12, conversion_rate: 0.09, mrr_impact: 1800, autonomy_level: 'AGENT_APPROVED', started_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { campaign_id: 'camp_retargeting_jun', name: 'June Interest→Trial Retargeting', type: 'retargeting', status: 'ACTIVE', recipients: 89, conversion_rate: 0.08, mrr_impact: 560, autonomy_level: 'AUTONOMOUS_EXECUTION', started_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { campaign_id: 'camp_save_red', name: 'RED Tier Save Campaign', type: 'email_drip', status: 'ACTIVE', recipients: 14, open_rate: 0.62, click_rate: 0.28, conversion_rate: 0.21, mrr_impact: 420, autonomy_level: 'AGENT_APPROVED', started_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const mockKeywords = [
  { keyword: 'ai marketplace platform', volume: 1200, difficulty: 42, current_rank: 8, priority_score: 0.81, estimated_traffic: 84, autonomy_level: 'AGENT_APPROVED' },
  { keyword: 'autonomous agent marketplace', volume: 890, difficulty: 31, current_rank: null, priority_score: 0.76, estimated_traffic: 62, autonomy_level: 'AUTONOMOUS_EXECUTION' },
  { keyword: 'ai vendor marketplace', volume: 2100, difficulty: 58, current_rank: null, priority_score: 0.69, estimated_traffic: 147, autonomy_level: 'AI_RECOMMENDED' },
  { keyword: 'b2b ai agent discovery', volume: 440, difficulty: 22, current_rank: null, priority_score: 0.88, estimated_traffic: 31, autonomy_level: 'AUTONOMOUS_EXECUTION' },
];

const mockChannels = [
  { channel: 'Organic Search', pct: 42, cac: 480, conversion_rate: 0.038 },
  { channel: 'Paid Search', pct: 28, cac: 1240, conversion_rate: 0.024 },
  { channel: 'Referral', pct: 18, cac: 310, conversion_rate: 0.052 },
  { channel: 'Direct', pct: 12, cac: 220, conversion_rate: 0.061 },
];

export default function GrowthAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'funnel' | 'campaigns' | 'seo' | 'acquisition'>('funnel');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #00E5A0, #00B4D8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🌱</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Growth Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.3 · Growth · Marketing · Campaign · SEO · Acquisition Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'Growth Score', value: `${mockGrowth.growth_score}/100`, color: '#F59E0B' },
            { label: 'CAC', value: `$${mockGrowth.cac_blended}`, color: '#E8E8F0' },
            { label: 'Payback', value: `${mockGrowth.payback_months}mo`, color: '#E8E8F0' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Organic Traffic Growth MoM', value: `+${(mockGrowth.organic_traffic_growth_mom * 100).toFixed(1)}%`, icon: '📈', color: '#00E5A0' },
          { label: 'Trial Start Rate', value: `${(mockGrowth.trial_start_rate * 100).toFixed(1)}%`, icon: '🔬', color: '#F59E0B', note: 'Target: 4.1%' },
          { label: 'Trial → Paid', value: `${(mockGrowth.trial_to_paid * 100).toFixed(0)}%`, icon: '💳', color: '#3B82F6' },
          { label: 'Viral Coefficient', value: mockGrowth.viral_coefficient.toFixed(2), icon: '🦠', color: '#14B8A6', note: 'Target: >0.4' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.color, marginBottom: '4px' }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>{kpi.label}</div>
            {kpi.note && <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px' }}>{kpi.note}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'funnel', label: '🔻 Funnel Analysis' },
          { id: 'campaigns', label: '📣 Active Campaigns' },
          { id: 'seo', label: '🔍 SEO Intelligence' },
          { id: 'acquisition', label: '🎯 Acquisition Mix' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`growth-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#00E5A0' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'funnel' && (
        <div>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <div>
              <div style={{ fontWeight: 600, color: '#EF4444', marginBottom: '4px' }}>Bottleneck Detected: {mockFunnel.top_bottleneck}</div>
              <div style={{ fontSize: '13px', color: '#D1D5DB' }}>{mockFunnel.recommended_intervention}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockFunnel.funnel.map((stage, i) => (
              <div key={stage.stage} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusColors[stage.status]}33`, borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '200px 1fr 120px 120px 120px', alignItems: 'center', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px' }}>{stage.stage}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{stage.visitors.toLocaleString()} users</div>
                </div>
                <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(stage.conversion_rate / 0.7) * 100}%`, background: statusColors[stage.status], borderRadius: '4px', transition: 'width 1s ease' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: statusColors[stage.status] }}>{(stage.conversion_rate * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>vs {(stage.baseline * 100).toFixed(1)}% base</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#E8E8F0' }}>z={stage.z_score}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>z-score</div>
                </div>
                <div style={{ background: `${statusColors[stage.status]}22`, borderRadius: '6px', padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: statusColors[stage.status] }}>{stage.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mockCampaigns.map(c => (
            <div key={c.campaign_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#E8E8F0', marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.type} · {c.recipients} recipients</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#00E5A0' }}>{c.open_rate ? `${(c.open_rate * 100).toFixed(0)}%` : '—'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Open Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#3B82F6' }}>{c.click_rate ? `${(c.click_rate * 100).toFixed(0)}%` : '—'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Click Rate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#14B8A6' }}>{c.conversion_rate ? `${(c.conversion_rate * 100).toFixed(0)}%` : '—'}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Conversion</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B' }}>+${c.mrr_impact?.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>MRR Impact</div>
              </div>
              <div style={{ background: `${levelColors[c.autonomy_level]}22`, borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: levelColors[c.autonomy_level] }}>{c.autonomy_level.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'seo' && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Keyword', 'Volume', 'Difficulty', 'Current Rank', 'Est. Traffic', 'Priority Score', 'Autonomy Level'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockKeywords.map(kw => (
                <tr key={kw.keyword} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: '#E8E8F0' }}>{kw.keyword}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#9CA3AF' }}>{kw.volume.toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ color: kw.difficulty < 35 ? '#00E5A0' : kw.difficulty < 55 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{kw.difficulty}</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: kw.current_rank ? '#E8E8F0' : '#4B5563' }}>{kw.current_rank ?? 'Not ranking'}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF' }}>{kw.estimated_traffic}/mo</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${kw.priority_score * 100}%`, background: '#00E5A0', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#00E5A0' }}>{kw.priority_score.toFixed(2)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: `${levelColors[kw.autonomy_level]}22`, color: levelColors[kw.autonomy_level], borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}>{kw.autonomy_level}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'acquisition' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {mockChannels.map(ch => (
            <div key={ch.channel} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#E8E8F0' }}>{ch.channel}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#00E5A0' }}>{ch.pct}%</div>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${ch.pct}%`, background: 'linear-gradient(90deg, #00E5A0, #00B4D8)', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#F59E0B' }}>${ch.cac}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>CAC</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#3B82F6' }}>{(ch.conversion_rate * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Conversion Rate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
