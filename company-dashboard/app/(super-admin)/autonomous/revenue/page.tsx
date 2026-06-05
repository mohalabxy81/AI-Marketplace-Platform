import React from 'react';
import { CreditCard, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { RevenueAgentService } from '@/features/autonomous/revenue/revenue-agent.service';
import { RetentionAgentService } from '@/features/autonomous/revenue/retention-agent.service';

export default async function RevenueAgentsDashboard() {
  const [opportunities, attribution, metrics] = await Promise.all([
    RevenueAgentService.scanRevenueOpportunities(),
    RevenueAgentService.getRevenueAttribution({ start: '2026-05-01', end: '2026-05-31' }),
    RetentionAgentService.getRetentionMetrics()
  ]);

  const totalOpportunityValue = opportunities.reduce((sum, opp) => sum + opp.expected_impact_usd, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-neutral-300 p-8 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-neutral-800 pb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 text-emerald-500">
            <CreditCard className="w-6 h-6" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Revenue Autonomy Layer</h1>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Revenue Agents Console</h2>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Attributed Revenue (MTD)</div>
          <div className="text-3xl font-mono text-emerald-500 font-bold border border-emerald-900 bg-emerald-950/30 px-4 py-2">
            +${(attribution.total_revenue_influenced_usd / 1000).toFixed(1)}K
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Retention Engine */}
        <div className="col-span-4 space-y-6">
          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Retention Engine
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-neutral-800 bg-black p-4">
                <div className="text-xs text-neutral-500 uppercase">Save Rate</div>
                <div className="text-xl font-mono text-white">{(metrics.save_rate * 100).toFixed(1)}%</div>
              </div>
              <div className="border border-neutral-800 bg-black p-4">
                <div className="text-xs text-neutral-500 uppercase">Saved ARR</div>
                <div className="text-xl font-mono text-emerald-500">${(metrics.revenue_saved_usd / 1000).toFixed(1)}K</div>
              </div>
            </div>
            <div className="text-xs text-neutral-400 font-mono border-t border-neutral-800 pt-4">
              <span className="text-emerald-500">{(metrics.agent_attribution_pct * 100).toFixed(0)}%</span> OF SAVES FULLY AUTONOMOUS
            </div>
          </div>

          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Agent ROI
            </h3>
            <div className="space-y-3 font-mono text-sm">
              {Object.entries(attribution.roi_per_agent).map(([agent, roi]) => (
                <div key={agent} className="flex justify-between items-center border-b border-neutral-800/50 pb-2">
                  <span className="text-neutral-400 text-xs">{agent.replace(' Agent', '')}</span>
                  <span className="text-emerald-500">{roi.toFixed(1)}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Opportunities */}
        <div className="col-span-8 border border-neutral-800 bg-[#0c0c12] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Live Revenue Interventions
            </h3>
            <div className="text-xs font-mono text-emerald-500 bg-emerald-950/30 px-2 py-1 border border-emerald-900">
              PIPELINE: ${(totalOpportunityValue / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="space-y-4">
            {opportunities.map(opp => (
              <div key={opp.opportunity_id} className="border border-neutral-800 bg-black p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-[10px] font-mono border ${
                      opp.urgency === 'CRITICAL' ? 'bg-red-950/30 text-red-500 border-red-900' :
                      opp.urgency === 'HIGH' ? 'bg-amber-950/30 text-amber-500 border-amber-900' :
                      'bg-emerald-950/30 text-emerald-500 border-emerald-900'
                    }`}>
                      {opp.type}
                    </span>
                    <span className="text-sm font-bold text-white">{opp.tenant_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-emerald-500">+${(opp.expected_impact_usd / 1000).toFixed(1)}K</div>
                    <div className="text-[10px] text-neutral-500 font-mono">CONF: {(opp.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-400 mb-4">{opp.recommended_action}</p>
                
                <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
                  <div className="text-[10px] text-neutral-500 font-mono uppercase">
                    SOURCE: {opp.agent_source} | POLICY: {opp.autonomy_level}
                  </div>
                  {opp.autonomy_level === 'AI_RECOMMENDED' ? (
                    <button className="flex items-center gap-1 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-500 border border-emerald-900 text-xs px-3 py-1 font-mono uppercase transition-colors">
                      <AlertCircle className="w-3 h-3" /> Approve
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
                      <ArrowUpRight className="w-3 h-3" /> AUTO-QUEUED
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
