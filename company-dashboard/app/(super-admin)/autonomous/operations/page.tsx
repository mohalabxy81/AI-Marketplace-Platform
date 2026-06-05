'use client';

import React, { useState } from 'react';

const sloStatusColors: Record<string, string> = {
  HEALTHY: '#00E5A0',
  AT_RISK: '#F59E0B',
  BURNED: '#EF4444',
};

const mockHealth = {
  api_latency_p99_ms: 145, error_rate: 0.0012, uptime_30d: 0.9998,
  cpu_avg: 0.42, memory_avg: 0.61, db_connections_active: 82, db_connections_max: 400,
  edge_function_p95_ms: 89, cache_hit_rate: 0.76, overall_status: 'OPERATIONAL',
};

const mockSLOs = [
  { service: 'API Gateway', slo_target: 0.999, current_value: 0.9998, error_budget_remaining: 0.82, burn_rate_1h: 0.4, burn_rate_6h: 0.6, status: 'HEALTHY' },
  { service: 'Auth Edge Function', slo_target: 0.9999, current_value: 0.99994, error_budget_remaining: 0.94, burn_rate_1h: 0.1, burn_rate_6h: 0.3, status: 'HEALTHY' },
  { service: 'Vector Search', slo_target: 0.99, current_value: 0.9942, error_budget_remaining: 0.58, burn_rate_1h: 1.2, burn_rate_6h: 0.9, status: 'AT_RISK' },
  { service: 'AI Embeddings', slo_target: 0.995, current_value: 0.9971, error_budget_remaining: 0.78, burn_rate_1h: 0.3, burn_rate_6h: 0.4, status: 'HEALTHY' },
  { service: 'Stripe Webhooks', slo_target: 0.999, current_value: 0.9993, error_budget_remaining: 0.70, burn_rate_1h: 0.8, burn_rate_6h: 0.7, status: 'HEALTHY' },
];

const mockIncidents = [
  {
    incident_id: 'inc_2026_0006_001', title: 'Vector Search p95 latency spike (>200ms threshold)',
    severity: 'P2', status: 'INVESTIGATING', affected_services: ['Discovery Engine', 'Feed API'],
    rca_summary: 'HNSW index rebuild triggered during peak traffic — concurrent write locks causing latency regression',
    recovery_action: 'Defer index rebuild to off-peak window. Increase read replica count.',
    autonomy_level: 'AI_RECOMMENDED', detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const mockCapacity = [
  { resource: 'Database Connections', current_utilization: 0.205, forecast_30d: 0.31, action_threshold: 0.70, status: 'HEALTHY' },
  { resource: 'Vector Index Size (GB)', current_utilization: 0.42, forecast_30d: 0.58, action_threshold: 0.80, status: 'HEALTHY' },
  { resource: 'Edge Function Invocations', current_utilization: 0.38, forecast_30d: 0.52, action_threshold: 0.85, status: 'HEALTHY' },
];

export default function OperationsAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'incidents' | 'sre'>('monitoring');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚙️</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Operations Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.6 · Monitoring · Incident · SRE Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '10px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#00E5A0' }}>● {mockHealth.overall_status}</div>
          </div>
          {[
            { label: 'P99 Latency', value: `${mockHealth.api_latency_p99_ms}ms`, color: '#E8E8F0' },
            { label: 'Error Rate', value: `${(mockHealth.error_rate * 100).toFixed(2)}%`, color: '#00E5A0' },
            { label: 'Uptime 30d', value: `${(mockHealth.uptime_30d * 100).toFixed(3)}%`, color: '#00E5A0' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'monitoring', label: '📊 System Monitoring' },
          { id: 'incidents', label: '🚨 Incidents' },
          { id: 'sre', label: '🔧 SRE & Capacity' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`ops-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#3B82F6' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monitoring' && (
        <div>
          {/* System Vitals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'CPU Average', value: `${(mockHealth.cpu_avg * 100).toFixed(0)}%`, color: '#00E5A0', bar: mockHealth.cpu_avg },
              { label: 'Memory Average', value: `${(mockHealth.memory_avg * 100).toFixed(0)}%`, color: '#3B82F6', bar: mockHealth.memory_avg },
              { label: 'DB Connections', value: `${mockHealth.db_connections_active}/${mockHealth.db_connections_max}`, color: '#F59E0B', bar: mockHealth.db_connections_active / mockHealth.db_connections_max },
              { label: 'Cache Hit Rate', value: `${(mockHealth.cache_hit_rate * 100).toFixed(0)}%`, color: '#14B8A6', bar: mockHealth.cache_hit_rate },
            ].map(v => (
              <div key={v.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: v.color, marginBottom: '8px' }}>{v.value}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px' }}>{v.label}</div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${v.bar * 100}%`, background: v.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
          {/* SLO Table */}
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Level Objectives</h3>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Service', 'SLO Target', 'Current', 'Error Budget', 'Burn 1h', 'Burn 6h', 'Status'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockSLOs.map(slo => (
                  <tr key={slo.service} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#E8E8F0', fontSize: '14px' }}>{slo.service}</td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{(slo.slo_target * 100).toFixed(2)}%</td>
                    <td style={{ padding: '14px 16px', color: '#E8E8F0', fontWeight: 600, fontSize: '13px' }}>{(slo.current_value * 100).toFixed(4)}%</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${slo.error_budget_remaining * 100}%`, background: slo.error_budget_remaining > 0.5 ? '#00E5A0' : '#F59E0B', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{(slo.error_budget_remaining * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: slo.burn_rate_1h > 1 ? '#EF4444' : '#9CA3AF', fontWeight: slo.burn_rate_1h > 1 ? 700 : 400, fontSize: '13px' }}>{slo.burn_rate_1h}x</td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{slo.burn_rate_6h}x</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: `${sloStatusColors[slo.status]}22`, color: sloStatusColors[slo.status], borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>{slo.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Open P0', value: '0', color: '#00E5A0' },
              { label: 'Open P1', value: '0', color: '#00E5A0' },
              { label: 'Open P2', value: '1', color: '#F59E0B' },
              { label: 'MTTR', value: '8.2min', color: '#3B82F6' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{k.label}</div>
              </div>
            ))}
          </div>
          {mockIncidents.map(inc => (
            <div key={inc.incident_id} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: '6px', padding: '4px 12px', fontWeight: 700, fontSize: '14px' }}>{inc.severity}</span>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#E8E8F0' }}>{inc.title}</span>
                <span style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: '6px', padding: '4px 10px', fontSize: '12px' }}>{inc.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Root Cause Analysis</div>
                  <div style={{ fontSize: '14px', color: '#D1D5DB' }}>{inc.rca_summary}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovery Action</div>
                  <div style={{ fontSize: '14px', color: '#D1D5DB' }}>{inc.recovery_action}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', borderRadius: '6px', padding: '4px 10px' }}>AI_RECOMMENDED</span>
                <button id="incident-execute-recovery" style={{ background: 'linear-gradient(135deg, #00E5A0, #00B4D8)', border: 'none', color: '#0A0A0F', borderRadius: '8px', padding: '8px 20px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Execute Recovery</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sre' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.1), rgba(0,180,216,0.1))', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#00E5A0' }}>94</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Reliability Score</div>
              <div style={{ fontSize: '11px', color: '#00E5A0', marginTop: '8px' }}>↑ Improving</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SRE Recommendation</div>
              <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: 1.6, margin: 0 }}>Vector Search SLO at risk — implement index rebuild scheduler before peak traffic window. Configure HNSW index builds to run exclusively between 02:00–04:00 UTC.</p>
            </div>
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase' }}>Capacity Forecast (30 Days)</h3>
          {mockCapacity.map(c => (
            <div key={c.resource} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '220px 1fr 100px 100px 120px', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px' }}>{c.resource}</div>
              <div style={{ position: 'relative', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${c.current_utilization * 100}%`, background: '#3B82F6', borderRadius: '5px' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${c.forecast_30d * 100}%`, background: 'rgba(59,130,246,0.3)', borderRadius: '5px' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${c.action_threshold * 100}%`, borderRight: '2px solid #EF4444' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#3B82F6' }}>{(c.current_utilization * 100).toFixed(0)}%</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Current</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#F59E0B' }}>{(c.forecast_30d * 100).toFixed(0)}%</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Forecast</div>
              </div>
              <span style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0', borderRadius: '6px', padding: '6px 10px', textAlign: 'center', fontSize: '12px', fontWeight: 600' }}>OK</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
