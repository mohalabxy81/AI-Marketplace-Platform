'use client';

import React, { useState } from 'react';

const mockBoardReports = [
  { report_id: 'br_Q2_2026', title: 'Q2 2026 Autonomous Operations Review', generated_at: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'READY', sections: ['Financial Performance', 'Autonomy Metrics', 'Strategic Outlook'] },
  { report_id: 'br_Q1_2026', title: 'Q1 2026 Executive Summary', generated_at: new Date(Date.now() - 86400000 * 92).toISOString(), status: 'ARCHIVED', sections: ['Financial Performance', 'Product Milestones'] },
];

const mockNarrative = `In Q2 2026, our transition to the Phase AU Autonomous Enterprise model accelerated our financial and operational efficiency significantly. 

ARR grew to $12.45M (+84% YoY) primarily driven by the Expansion Agent identifying whitespace opportunities in our Enterprise segment. The Pricing Agent's micro-adjustments contributed an estimated $84k in incremental MRR without impacting churn, maintaining our world-class NDR of 114%.

Operational autonomy reached 82% across all support and marketplace curation workflows. The Trust & Fraud Agents successfully blocked 420 fraudulent attempts automatically, saving an estimated $48k in chargebacks and manual review costs.

Looking forward to Q3, the Strategy Agent recommends re-allocating 30% of our performance marketing budget from SMB to Enterprise acquisition, citing a 3.1x improvement in LTV/CAC in the upper market segment.`;

export default function BoardAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'narrative'>('reports');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #F59E0B, #B45309)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏛️</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Board Copilot</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.1 · Automated Board Reporting · Narrative Generation</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'reports', label: '📑 Board Packages' },
          { id: 'narrative', label: '✍️ Auto-Narrative' },
        ].map(tab => (
          <button
            key={tab.id}
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

      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {mockBoardReports.map(report => (
             <div key={report.report_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ fontSize: '24px' }}>📄</div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: report.status === 'READY' ? '#10B981' : '#6B7280', background: report.status === 'READY' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{report.status}</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>{report.title}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px' }}>Generated: {new Date(report.generated_at).toLocaleDateString()}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {report.sections.map(s => <span key={s} style={{ fontSize: '11px', color: '#9CA3AF', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>{s}</span>)}
                </div>
                <button style={{ marginTop: 'auto', padding: '12px', background: report.status === 'READY' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.05)', color: report.status === 'READY' ? '#FFF' : '#9CA3AF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Download PDF</button>
             </div>
          ))}
        </div>
      )}

      {activeTab === 'narrative' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: 0 }}>Latest Agent-Drafted Narrative</h3>
             <button style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Regenerate Draft</button>
           </div>
           <div style={{ fontSize: '15px', color: '#D1D5DB', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
             {mockNarrative}
           </div>
        </div>
      )}
    </div>
  );
}
