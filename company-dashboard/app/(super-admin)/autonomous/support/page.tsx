'use client';

import React, { useState } from 'react';

const priorityColors: Record<string, string> = { P1: '#DC2626', P2: '#EF4444', P3: '#F59E0B', P4: '#6B7280' };
const statusColors: Record<string, string> = { OPEN: '#E8E8F0', AUTO_RESOLVING: '#00E5A0', ESCALATED: '#EF4444', RESOLVED: '#6B7280' };

const mockTickets = {
  open: 23, auto_resolved_today: 41, avg_resolution_minutes: 8.4,
  escalated_to_human: 7, csat_score: 4.3, p1_open: 0, pending_agent: 16, first_response_time_minutes: 1.2,
};

const mockOnboarding = {
  completion_rate_overall: 0.44, avg_time_to_aha_days: 3.2,
  steps: [
    { step: 'Account Created', completed_count: 89, completion_rate: 1.0, avg_time_to_complete_minutes: 2, drop_off_pct: 0 },
    { step: 'Profile Completed', completed_count: 71, completion_rate: 0.80, avg_time_to_complete_minutes: 8, drop_off_pct: 0.20 },
    { step: 'First Listing', completed_count: 58, completion_rate: 0.65, avg_time_to_complete_minutes: 24, drop_off_pct: 0.18 },
    { step: 'Aha! Moment (3 matches)', completed_count: 39, completion_rate: 0.44, avg_time_to_complete_minutes: 2880, drop_off_pct: 0.33 },
  ],
};

const mockOpenTickets = [
  { ticket_id: 'tk_1001', subject: 'Cannot publish listing — quality score too low', priority: 'P2', status: 'AUTO_RESOLVING', agent_confidence: 0.89, suggested_resolution: 'Trigger AI enrichment → re-score → auto-publish if ≥0.75', tenant_name: 'Acme Corp' },
  { ticket_id: 'tk_1002', subject: 'Billing charge appears incorrect', priority: 'P2', status: 'ESCALATED', agent_confidence: 0.42, suggested_resolution: 'Requires human billing review', tenant_name: 'Delta Corp' },
  { ticket_id: 'tk_1003', subject: 'How to set up team members?', priority: 'P4', status: 'AUTO_RESOLVING', agent_confidence: 0.97, suggested_resolution: 'Knowledge base article KB-0041 sent', tenant_name: 'Globex Inc' },
];

export default function SupportAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'support' | 'onboarding' | 'cs' | 'vendor'>('support');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🤝</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Support Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.5 · Support · Onboarding · Customer Success · Vendor Success Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'Auto-Resolved Today', value: mockTickets.auto_resolved_today.toString(), color: '#00E5A0' },
            { label: 'CSAT', value: `${mockTickets.csat_score}/5`, color: '#F59E0B' },
            { label: 'Avg Resolution', value: `${mockTickets.avg_resolution_minutes}min`, color: '#3B82F6' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'support', label: '🎫 Support Agent' },
          { id: 'onboarding', label: '🚀 Onboarding Agent' },
          { id: 'cs', label: '💚 Customer Success' },
          { id: 'vendor', label: '🏢 Vendor Success' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`support-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#F59E0B' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'support' && (
        <div>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Open Tickets', value: mockTickets.open.toString(), color: '#E8E8F0', sub: `${mockTickets.p1_open} P1 open` },
              { label: 'Auto-Resolved (24h)', value: mockTickets.auto_resolved_today.toString(), color: '#00E5A0', sub: 'By Support Agent' },
              { label: 'Escalated to Human', value: mockTickets.escalated_to_human.toString(), color: '#EF4444', sub: 'Low confidence cases' },
              { label: 'First Response Time', value: `${mockTickets.first_response_time_minutes}min`, color: '#3B82F6', sub: 'Target: <2min' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: k.color, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>{k.label}</div>
                <div style={{ fontSize: '11px', color: '#4B5563' }}>{k.sub}</div>
              </div>
            ))}
          </div>
          {/* Ticket Queue */}
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Ticket Queue</h3>
          {mockOpenTickets.map(t => (
            <div key={t.ticket_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '60px 1fr 140px 100px', alignItems: 'center', gap: '16px' }}>
              <span style={{ background: `${priorityColors[t.priority]}22`, color: priorityColors[t.priority], borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>{t.priority}</span>
              <div>
                <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px', marginBottom: '2px' }}>{t.subject}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>{t.tenant_name} · Confidence: {(t.agent_confidence * 100).toFixed(0)}%</div>
                <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>{t.suggested_resolution}</div>
              </div>
              <div style={{ background: `${statusColors[t.status]}22`, borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: statusColors[t.status] }}>{t.status.replace('_', ' ')}</span>
              </div>
              <button id={`ticket-action-${t.ticket_id}`} style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', color: '#00E5A0', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                {t.status === 'ESCALATED' ? 'Review' : 'Override'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'onboarding' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 200px 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#F59E0B' }}>{(mockOnboarding.completion_rate_overall * 100).toFixed(0)}%</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Overall Completion</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#3B82F6' }}>{mockOnboarding.avg_time_to_aha_days}d</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Avg Time to Aha!</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontWeight: 600, color: '#9CA3AF', marginBottom: '12px', fontSize: '12px', textTransform: 'uppercase' }}>Onboarding Funnel</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '80px' }}>
                {mockOnboarding.steps.map((step, i) => (
                  <div key={step.step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '100%', background: `hsla(${160 - i * 30}, 80%, 60%, 0.7)`, borderRadius: '4px 4px 0 0', height: `${step.completion_rate * 80}px`, minHeight: '8px' }} />
                    <div style={{ fontSize: '10px', color: '#6B7280', textAlign: 'center' }}>{step.completed_count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {mockOnboarding.steps.map((step, i) => (
            <div key={step.step} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '200px 1fr 80px 80px 100px', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px' }}>{step.step}</div>
              <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${step.completion_rate * 100}%`, background: step.completion_rate > 0.6 ? '#00E5A0' : step.completion_rate > 0.4 ? '#F59E0B' : '#EF4444', borderRadius: '4px' }} />
              </div>
              <div style={{ textAlign: 'center', fontWeight: 700, color: step.completion_rate > 0.6 ? '#00E5A0' : '#F59E0B' }}>{(step.completion_rate * 100).toFixed(0)}%</div>
              <div style={{ textAlign: 'center', color: '#EF4444', fontWeight: 600 }}>{(step.drop_off_pct * 100).toFixed(0)}%↓</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{step.avg_time_to_complete_minutes >= 60 ? `${(step.avg_time_to_complete_minutes / 60).toFixed(0)}h` : `${step.avg_time_to_complete_minutes}min`}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'cs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '20px', textTransform: 'uppercase' }}>Health Score Distribution</h3>
            {[
              { label: 'Green', value: 280, total: 342, color: '#00E5A0' },
              { label: 'Yellow', value: 48, total: 342, color: '#F59E0B' },
              { label: 'Red', value: 14, total: 342, color: '#EF4444' },
            ].map(h => (
              <div key={h.label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', color: h.color, fontWeight: 600 }}>● {h.label}</span>
                  <span style={{ fontWeight: 700, color: '#E8E8F0' }}>{h.value} tenants</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(h.value / h.total) * 100}%`, background: h.color, borderRadius: '5px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '20px', textTransform: 'uppercase' }}>Agent Actions Available</h3>
            {[
              { action: 'QBR Scheduling', count: 12, level: 'AGENT_APPROVED' },
              { action: 'Save Campaign Trigger', count: 14, level: 'AGENT_APPROVED' },
              { action: 'Expansion Outreach', count: 23, level: 'AGENT_APPROVED' },
              { action: 'Executive Escalation', count: 4, level: 'HUMAN_DECISION' },
            ].map(a => (
              <div key={a.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#E8E8F0', fontWeight: 500 }}>{a.action}</div>
                  <span style={{ fontSize: '10px', color: a.level === 'AGENT_APPROVED' ? '#3B82F6' : '#EF4444', background: a.level === 'AGENT_APPROVED' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '4px', padding: '2px 6px' }}>{a.level}</span>
                </div>
                <button id={`cs-action-${a.action.toLowerCase().replace(/ /g, '-')}`} style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', color: '#00E5A0', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  Run ({a.count})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'vendor' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {[
            { label: 'Total Vendors', value: '1,204', color: '#E8E8F0', icon: '🏢' },
            { label: 'Active Vendors', value: '987', color: '#00E5A0', icon: '✅' },
            { label: 'Avg Listing Quality', value: '78%', color: '#3B82F6', icon: '⭐' },
            { label: 'Avg Response Time', value: '6.2h', color: '#F59E0B', icon: '⏱️' },
            { label: 'Low Performing', value: '48', color: '#EF4444', icon: '⚠️' },
            { label: 'Outreach Queued', value: '48', color: '#14B8A6', icon: '📬' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
