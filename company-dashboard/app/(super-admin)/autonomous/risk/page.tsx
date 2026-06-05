import React from 'react';
import { ShieldAlert, Activity, AlertOctagon, RefreshCw, BarChart2 } from 'lucide-react';
import { RiskForecastService } from '@/features/autonomous/executive/risk-forecast.service';

export default async function RiskForecastDashboard() {
  const register = await RiskForecastService.getRiskRegister();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-neutral-300 p-8 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-neutral-800 pb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 text-red-500">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Risk Autonomy Layer</h1>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Risk Forecast</h2>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">Composite Risk Score</div>
          <div className={`text-3xl font-mono font-bold border px-4 py-2 ${
            register.risk_level === 'CRITICAL' ? 'text-red-500 border-red-900 bg-red-950/30' :
            register.risk_level === 'HIGH' ? 'text-amber-500 border-amber-900 bg-amber-950/30' :
            register.risk_level === 'MEDIUM' ? 'text-yellow-500 border-yellow-900 bg-yellow-950/30' :
            'text-emerald-500 border-emerald-900 bg-emerald-950/30'
          }`}>
            {register.overall_risk_score.toFixed(3)} <span className="text-sm font-sans tracking-widest ml-1">{register.risk_level}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Monte Carlo Sim */}
        <div className="col-span-12 border border-neutral-800 bg-[#0c0c12] p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-red-500" />
                Monte Carlo Simulation (10,000 Iterations)
              </h3>
              <p className="text-sm text-neutral-500">Probabilistic financial impact over 90-day horizon</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500 uppercase font-mono mb-1">P(Impact &gt; $500K)</div>
              <div className="text-xl font-mono text-amber-500">{(register.monte_carlo_summary.probability_of_major_impact * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-black border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">P50 (Median Case)</div>
              <div className="text-2xl font-mono text-emerald-500">${(register.monte_carlo_summary.p50_impact_usd / 1000).toFixed(1)}K</div>
            </div>
            <div className="bg-black border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">P90 (Worst Case 10%)</div>
              <div className="text-2xl font-mono text-amber-500">${(register.monte_carlo_summary.p90_impact_usd / 1000).toFixed(1)}K</div>
            </div>
            <div className="bg-black border border-neutral-800 p-4">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">P99 (Tail Risk 1%)</div>
              <div className="text-2xl font-mono text-red-500">${(register.monte_carlo_summary.p99_impact_usd / 1000).toFixed(1)}K</div>
            </div>
          </div>
        </div>

        {/* Risk Registry */}
        <div className="col-span-8 border border-neutral-800 bg-[#0c0c12] p-6">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            Active Risk Registry
          </h3>

          <div className="space-y-4">
            {register.risks.map(risk => (
              <div key={risk.risk_id} className="border border-neutral-800 bg-black p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-mono border ${
                        risk.severity === 'CRITICAL' ? 'bg-red-950/30 text-red-500 border-red-900' :
                        risk.severity === 'HIGH' ? 'bg-amber-950/30 text-amber-500 border-amber-900' :
                        'bg-yellow-950/30 text-yellow-500 border-yellow-900'
                      }`}>
                        {risk.category}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">ID: {risk.risk_id}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{risk.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-red-500">SCORE: {risk.composite_score.toFixed(3)}</div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase mt-1">
                      {risk.trend === 'DETERIORATING' ? '▲ WORSENING' : risk.trend === 'IMPROVING' ? '▼ IMPROVING' : '▬ STABLE'}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-neutral-400 mb-4">{risk.description}</p>
                
                <div className="bg-neutral-900/50 p-3 border-l-2 border-amber-500 mb-4">
                  <div className="text-[10px] text-amber-500 font-mono uppercase mb-1">Mitigation Strategy</div>
                  <div className="text-sm text-neutral-300">{risk.mitigation}</div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono uppercase border-t border-neutral-800 pt-3">
                  <div>OWNER: <span className="text-neutral-300">{risk.owner}</span></div>
                  <div>PROB: {(risk.probability * 100).toFixed(0)}% | HORIZON: {risk.time_horizon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Concentration Risks */}
        <div className="col-span-4 space-y-6">
          <div className="border border-neutral-800 bg-[#0c0c12] p-6">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-500" />
              Concentration Exposure
            </h3>
            <div className="space-y-5">
              {register.concentration_risks.map((cr, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-neutral-300 uppercase">{cr.type}</span>
                    <span className={`text-xs font-mono ${cr.at_risk ? 'text-red-500' : 'text-teal-500'}`}>
                      {cr.concentration_pct}% (Limit: {cr.threshold_pct}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mb-2">{cr.description}</p>
                  <div className="h-1 w-full bg-neutral-900">
                    <div 
                      className={`h-full ${cr.at_risk ? 'bg-red-500' : 'bg-teal-500'}`} 
                      style={{ width: `${Math.min(cr.concentration_pct, 100)}%` }} 
                    />
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
