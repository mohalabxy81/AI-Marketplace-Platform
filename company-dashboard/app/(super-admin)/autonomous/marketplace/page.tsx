'use client';

import React, { useState } from 'react';

const levelColors: Record<string, string> = {
  AUTONOMOUS_EXECUTION: '#00E5A0',
  AGENT_APPROVED: '#3B82F6',
  AI_RECOMMENDED: '#F59E0B',
  HUMAN_DECISION: '#EF4444',
};

const severityColors: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#DC2626',
};

const mockListing = {
  total: 8420, published: 7102, quarantined: 89, pending_review: 341,
  auto_published_today: 234, quality_score_avg: 0.78, enriched_today: 412, embedding_coverage: 0.94,
};

const mockTrust = {
  avg_trust_score: 0.81, high_trust_tenants: 289, below_threshold: 12,
  disputes_open: 4, verifications_pending: 23, verifications_completed_today: 18, trust_score_improved_today: 7,
};

const mockFraud = {
  checks_24h: 1203, flagged_24h: 7, confirmed_fraud_24h: 3, false_positives_24h: 1,
  fraud_prevented_usd: 12400, accounts_frozen_active: 4, auto_freeze_rate: 0.67,
};

const mockDiscovery = {
  feed_requests_24h: 48200, avg_latency_ms: 42, cache_hit_rate: 0.76,
  vector_search_p95_ms: 28, rerank_p95_ms: 61, ctr_avg: 0.084, relevance_score_avg: 0.78, ab_tests_active: 2,
};

const mockFraudSignals = [
  { signal_id: 'sig_001', tenant_id: 'ten_suspect_002', signal_type: 'RAPID_LISTING_CREATION', risk_score: 0.87, severity: 'HIGH', auto_action: 'Rate-limited to 5 listings/day', autonomy_level: 'AGENT_APPROVED', detected_at: new Date(Date.now() - 3600000).toISOString() },
  { signal_id: 'sig_002', tenant_id: 'ten_suspect_003', signal_type: 'PAYMENT_ANOMALY', risk_score: 0.93, severity: 'CRITICAL', auto_action: 'Account frozen — awaiting review', autonomy_level: 'AUTONOMOUS_EXECUTION', detected_at: new Date(Date.now() - 7200000).toISOString() },
];

export default function MarketplaceAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'listing' | 'trust' | 'fraud' | 'discovery'>('listing');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏪</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Marketplace Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.4 · Listing · Discovery · Matching · Trust · Fraud Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'Listings', value: mockListing.total.toLocaleString(), color: '#A78BFA' },
            { label: 'Fraud Prevented', value: `$${mockFraud.fraud_prevented_usd.toLocaleString()}`, color: '#00E5A0' },
            { label: 'Avg Trust', value: `${(mockTrust.avg_trust_score * 100).toFixed(0)}%`, color: '#3B82F6' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'listing', label: '📋 Listing Agent' },
          { id: 'trust', label: '🛡️ Trust Agent' },
          { id: 'fraud', label: '⚠️ Fraud Agent' },
          { id: 'discovery', label: '🔍 Discovery Agent' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`marketplace-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
              background: activeTab === tab.id ? '#A78BFA' : 'transparent',
              color: activeTab === tab.id ? '#0A0A0F' : '#9CA3AF',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'listing' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Listings', value: mockListing.total.toLocaleString(), color: '#E8E8F0', sub: `${mockListing.published.toLocaleString()} published` },
              { label: 'Auto-Published Today', value: mockListing.auto_published_today.toString(), color: '#00E5A0', sub: 'Agent-approved' },
              { label: 'Avg Quality Score', value: `${(mockListing.quality_score_avg * 100).toFixed(0)}%`, color: '#3B82F6', sub: 'Target: 80%' },
              { label: 'Embedding Coverage', value: `${(mockListing.embedding_coverage * 100).toFixed(0)}%`, color: '#A78BFA', sub: 'Vector indexed' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: k.color, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>{k.label}</div>
                <div style={{ fontSize: '11px', color: '#4B5563' }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Quarantined', value: mockListing.quarantined, color: '#EF4444', icon: '🚫' },
              { label: 'Pending Review', value: mockListing.pending_review, color: '#F59E0B', icon: '⏳' },
              { label: 'Enriched Today', value: mockListing.enriched_today, color: '#00E5A0', icon: '✨' },
            ].map(s => (
              <div key={s.label} style={{ background: `${s.color}11`, border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '28px' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trust' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#9CA3AF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trust Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'High Trust (≥0.8)', value: mockTrust.high_trust_tenants, pct: 0.845, color: '#00E5A0' },
                { label: 'Below Threshold (<0.5)', value: mockTrust.below_threshold, pct: 0.035, color: '#EF4444' },
              ].map(t => (
                <div key={t.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{t.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: t.color }}>{t.value}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.pct * 100}%`, background: t.color, borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6' }}>{mockTrust.avg_trust_score.toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Avg Trust Score</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>{mockTrust.disputes_open}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Open Disputes</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#9CA3AF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Pipeline</h3>
            {[
              { label: 'Pending Verification', value: mockTrust.verifications_pending, color: '#F59E0B' },
              { label: 'Completed Today', value: mockTrust.verifications_completed_today, color: '#00E5A0' },
              { label: 'Trust Score Improved', value: mockTrust.trust_score_improved_today, color: '#3B82F6' },
            ].map(v => (
              <div key={v.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{v.label}</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: v.color }}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fraud' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Checks (24h)', value: mockFraud.checks_24h.toLocaleString(), color: '#E8E8F0' },
              { label: 'Confirmed Fraud', value: mockFraud.confirmed_fraud_24h.toString(), color: '#EF4444' },
              { label: 'Fraud Prevented', value: `$${mockFraud.fraud_prevented_usd.toLocaleString()}`, color: '#00E5A0' },
              { label: 'Auto-Freeze Rate', value: `${(mockFraud.auto_freeze_rate * 100).toFixed(0)}%`, color: '#3B82F6' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{k.label}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Fraud Signals</h3>
          {mockFraudSignals.map(s => (
            <div key={s.signal_id} style={{ background: `${severityColors[s.severity]}11`, border: `1px solid ${severityColors[s.severity]}33`, borderRadius: '12px', padding: '20px', marginBottom: '12px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px', marginBottom: '4px' }}>{s.signal_type.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Tenant: {s.tenant_id}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: severityColors[s.severity] }}>{s.risk_score.toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Risk Score</div>
              </div>
              <div style={{ background: `${severityColors[s.severity]}22`, borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: severityColors[s.severity] }}>{s.severity}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{s.auto_action}</div>
              <div style={{ background: `${levelColors[s.autonomy_level]}22`, borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: levelColors[s.autonomy_level] }}>{s.autonomy_level.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'discovery' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {[
            { label: 'Feed Requests (24h)', value: mockDiscovery.feed_requests_24h.toLocaleString(), icon: '📡', color: '#00E5A0' },
            { label: 'Avg Latency', value: `${mockDiscovery.avg_latency_ms}ms`, icon: '⚡', color: '#3B82F6' },
            { label: 'Cache Hit Rate', value: `${(mockDiscovery.cache_hit_rate * 100).toFixed(0)}%`, icon: '💾', color: '#A78BFA' },
            { label: 'Vector Search p95', value: `${mockDiscovery.vector_search_p95_ms}ms`, icon: '🎯', color: '#F59E0B' },
            { label: 'Re-rank p95', value: `${mockDiscovery.rerank_p95_ms}ms`, icon: '🔄', color: '#E8E8F0' },
            { label: 'CTR Average', value: `${(mockDiscovery.ctr_avg * 100).toFixed(1)}%`, icon: '👆', color: '#00E5A0' },
            { label: 'Relevance Score', value: (mockDiscovery.relevance_score_avg).toFixed(2), icon: '🎪', color: '#3B82F6' },
            { label: 'Active A/B Tests', value: mockDiscovery.ab_tests_active.toString(), icon: '🧪', color: '#F59E0B' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
