'use client';

import React, { useState } from 'react';

const mockKnowledgeStats = {
  total_nodes: 1847,
  total_edges: 4203,
  node_types: {
    concept: 412,
    entity: 589,
    fact: 334,
    procedure: 278,
    insight: 234,
  },
  avg_confidence: 0.81,
  top_concepts: ['marketplace optimization', 'churn signals', 'pricing strategy', 'trust scoring', 'agent orchestration'],
  growth_7d: 89,
};

const mockMemory = {
  agent_id: 'All Agents',
  active_contexts: 12,
  total_memories: 1847,
  last_consolidated: new Date(Date.now() - 3600000 * 6).toISOString(),
  stm_items: 48,
  ltm_items: 1799,
  tenant_contexts: 342,
  memory_size_mb: 24.8,
};

const mockLearning = {
  model_updates_7d: 3,
  accuracy_delta: +0.023,
  new_patterns_detected: 14,
  knowledge_nodes_added: 89,
  training_cost_usd: 12.40,
  performance_improvement_pct: 2.3,
  active_experiments: 4,
};

const mockSearchResults = [
  {
    node_id: 'kn_001',
    content: `Best practices for AI marketplace optimization: semantic search with RRF fusion outperforms pure keyword search by 34% CTR. Optimal vector dimensions: 1536 (OpenAI text-embedding-3-small).`,
    node_type: 'procedure', confidence: 0.87, source_agent: 'discovery-agent', access_count: 42,
  },
  {
    node_id: 'kn_002',
    content: `Churn prevention insight: tenants logging in <3x per week have 3.2x higher 90-day churn probability. Optimal intervention window: day 7–14 of low engagement.`,
    node_type: 'insight', confidence: 0.92, source_agent: 'retention-agent', access_count: 87,
  },
];

const mockExperiments = [
  { name: 'RRF Weight Tuning v3', hypothesis: 'Increasing BM25 weight to 0.4 improves CTR by 5%', status: 'RUNNING', confidence: null },
  { name: 'Churn Intervention Timing', hypothesis: 'Day 9 nudge outperforms day 7 by 12% save rate', status: 'COMPLETE', winner: 'day_9', confidence: 0.89 },
];

export default function KnowledgeAutonomyPage() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'memory' | 'learning'>('knowledge');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧠</div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Knowledge Autonomy</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>AU.7 · Knowledge Graph · Context Memory · Learning Agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[
            { label: 'Nodes', value: mockKnowledgeStats.total_nodes.toLocaleString(), color: '#10B981' },
            { label: 'Growth (7d)', value: `+${mockKnowledgeStats.growth_7d}`, color: '#10B981' },
            { label: 'Avg Confidence', value: `${(mockKnowledgeStats.avg_confidence * 100).toFixed(0)}%`, color: '#3B82F6' },
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
          { id: 'knowledge', label: '🕸️ Knowledge Graph' },
          { id: 'memory', label: '🗄️ Context Memory' },
          { id: 'learning', label: '🧬 Learning & Experiments' },
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

      {activeTab === 'knowledge' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          <div>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Semantic search across enterprise knowledge..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 20px', fontSize: '16px', color: '#FFF', outline: 'none' }}
              />
              <span style={{ position: 'absolute', right: '20px', top: '16px', fontSize: '18px', color: '#6B7280' }}>🔍</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockSearchResults.map(res => (
                <div key={res.node_id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{res.node_type}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{res.node_id}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>Confidence: <span style={{ color: '#10B981', fontWeight: 600 }}>{(res.confidence * 100).toFixed(0)}%</span></div>
                  </div>
                  <p style={{ fontSize: '15px', color: '#D1D5DB', lineHeight: 1.6, margin: '0 0 16px 0' }}>{res.content}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <span>Source: <span style={{ color: '#9CA3AF' }}>{res.source_agent}</span></span>
                    <span>Accessed: <span style={{ color: '#9CA3AF' }}>{res.access_count}x</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Node Distribution</h3>
              {Object.entries(mockKnowledgeStats.node_types).map(([type, count]) => (
                <div key={type} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: '#D1D5DB', textTransform: 'capitalize' }}>{type}</span>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / mockKnowledgeStats.total_nodes) * 100}%`, background: '#10B981', borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'memory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
           {[
            { label: 'Active Contexts', value: mockMemory.active_contexts.toString(), color: '#10B981' },
            { label: 'STM Items', value: mockMemory.stm_items.toString(), color: '#3B82F6', sub: 'Short-term memory' },
            { label: 'LTM Items', value: mockMemory.ltm_items.toString(), color: '#F59E0B', sub: 'Long-term memory (Vector)' },
            { label: 'Memory Size', value: `${mockMemory.memory_size_mb} MB`, color: '#14B8A6' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: m.color, marginBottom: '4px' }}>{m.value}</div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '4px' }}>{m.label}</div>
              {m.sub && <div style={{ fontSize: '11px', color: '#4B5563' }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'learning' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
           <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Learning Metrics (7d)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{mockLearning.model_updates_7d}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Model Updates</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6' }}>+{mockLearning.performance_improvement_pct}%</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Performance Uplift</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{mockLearning.new_patterns_detected}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>New Patterns Found</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#E8E8F0' }}>${mockLearning.training_cost_usd.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Training Cost</div>
                </div>
              </div>
           </div>
           
           <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Experiments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {mockExperiments.map(exp => (
                  <div key={exp.name} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${exp.status === 'RUNNING' ? '#3B82F6' : '#10B981'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, color: '#E8E8F0', fontSize: '14px' }}>{exp.name}</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: exp.status === 'RUNNING' ? '#3B82F6' : '#10B981' }}>{exp.status}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>{exp.hypothesis}</div>
                    {exp.status === 'COMPLETE' && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>Winner: <span style={{ color: '#10B981' }}>{exp.winner}</span> ({(exp.confidence! * 100).toFixed(0)}% conf)</div>
                    )}
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
