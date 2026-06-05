import React from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle, Activity, Zap, DollarSign } from 'lucide-react';
import { ExecutiveCopilotService } from '@/features/autonomous/executive/executive-copilot.service';

export default async function ExecutiveCopilotDashboard() {
  const brief = await ExecutiveCopilotService.generateExecutiveBrief();
  const kpis = brief.kpi_snapshot.metrics;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-neutral-300 p-8 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-neutral-800 pb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 text-amber-500">
            <BrainCircuit className="w-6 h-6" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Executive Intelligence Layer</h1>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">CEO Copilot Console</h2>
          <p className="text-sm text-neutral-500 mt-2 font-mono">
            PERIOD: {new Date(brief.period.start).toISOString().split('T')[0]} TO {new Date(brief.period.end).toISOString().split('T')[0]} | ID: {brief.brief_id}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Platform Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse" />
            <span className="font-mono text-emerald-500 font-bold">NOMINAL</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* KPI Panel - 8 cols */}
        <div className="col-span-8 space-y-6">
          <div className="border border-neutral-800 bg-[#0c0c12] p-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-teal-500" />
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6">Real-Time Telemetry</h3>
            
            <div className="grid grid-cols-4 gap-6">
              {[
                { name: 'ARR', val: kpis.arr, icon: DollarSign },
                { name: 'NRR', val: kpis.nrr, icon: TrendingUp },
                { name: 'Autonomy', val: kpis.autonomy_score, icon: Zap },
                { name: 'Trust', val: kpis.trust_score_avg, icon: CheckCircle }
              ].map((k, i) => (
                <div key={i} className="border border-neutral-800 p-4 bg-black">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-neutral-500 uppercase">{k.name}</span>
                    <k.icon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="text-2xl font-mono text-white mb-2">
                    {k.name === 'ARR' ? '$' + (k.val.value / 1000000).toFixed(2) + 'M' : 
                     k.name === 'NRR' || k.name === 'Autonomy' || k.name === 'Trust' ? (k.val.value * 100).toFixed(1) + (k.name === 'Trust' ? '' : '%') : 
                     k.val.value.toLocaleString()}
                  </div>
                  <div className={`text-xs font-mono font-bold flex items-center gap-1 ${k.val.status === 'ON_TRACK' ? 'text-teal-500' : k.val.status === 'AT_RISK' ? 'text-amber-500' : 'text-red-500'}`}>
                    {k.val.trend === 'UP' ? '▲' : k.val.trend === 'DOWN' || k.val.trend === 'DOWN_GOOD' ? '▼' : '▬'} {k.val.delta_7d}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Intelligence Synthesis
            </h3>
            <div className="space-y-4">
              {brief.ai_insights.map(insight => (
                <div key={insight.id} className="border-l-2 border-neutral-700 pl-4 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono px-2 py-0.5 bg-neutral-900 ${insight.impact === 'POSITIVE' ? 'text-teal-500' : 'text-red-500'}`}>
                      {insight.category}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">CONFIDENCE: {(insight.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <h4 className="text-white font-bold mb-1">{insight.headline}</h4>
                  <p className="text-sm text-neutral-400">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel - 4 cols */}
        <div className="col-span-4 space-y-6">
          {/* Revenue Forecast */}
          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">30-Day Forecast</h3>
            <div className="text-3xl font-mono text-white mb-1">
              ${(brief.revenue_forecast_30d.forecast_mrr / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-neutral-500 font-mono mb-4">
              MRR PROJECTION | CI: ±{((brief.revenue_forecast_30d.confidence_interval.upper / brief.revenue_forecast_30d.forecast_mrr - 1) * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-neutral-400 border-t border-neutral-800 pt-4">
              {brief.revenue_forecast_30d.narrative}
            </p>
          </div>

          {/* Recommendations */}
          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Awaiting Decision</h3>
            <div className="space-y-4">
              {brief.recommendations.map(rec => (
                <div key={rec.id} className="bg-black border border-neutral-800 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                    {rec.urgency === 'HIGH' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-xs text-neutral-400 mb-4">{rec.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-teal-500">+${(rec.expected_impact_usd! / 1000).toFixed(1)}K ARR</span>
                    <button className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-3 py-1 font-mono uppercase transition-colors">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
