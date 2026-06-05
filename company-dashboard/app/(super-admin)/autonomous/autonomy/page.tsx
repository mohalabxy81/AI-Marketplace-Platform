import React from 'react';
import { LineChart as LineChartIcon, Settings, Shield, Zap, Target } from 'lucide-react';
import { AutonomyMetricsService } from '@/features/autonomous/metrics/autonomy-metrics.service';

export default async function AutonomyMetricsDashboard() {
  const metrics = await AutonomyMetricsService.getSnapshot();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-neutral-300 p-8 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-neutral-800 pb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2 text-teal-500">
            <LineChartIcon className="w-6 h-6" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Autonomy Metrics</h1>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Autonomy Score</h2>
          <p className="text-sm text-neutral-500 mt-2 font-mono">
            MATURITY LEVEL: {metrics.maturity_level.replace(/_/g, ' ')} | INDEX: {metrics.autonomous_enterprise_index}/100
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono text-teal-500 font-bold border border-teal-900 bg-teal-950/30 px-4 py-2">
            {metrics.autonomy_score.value}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Core Metrics */}
        <div className="col-span-12 grid grid-cols-4 gap-6">
          {[
            { name: 'Agent Utilization', metric: metrics.agent_utilization },
            { name: 'Automation Rate', metric: metrics.automation_rate },
            { name: 'Resolution Rate', metric: metrics.resolution_rate },
            { name: 'Risk Score', metric: metrics.risk_score }
          ].map((m, i) => (
            <div key={i} className="border border-neutral-800 bg-[#0c0c12] p-5">
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-2">{m.name}</div>
              <div className="text-2xl font-mono text-white mb-1">{m.metric.value}{m.metric.unit}</div>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 bg-neutral-900">
                  <div 
                    className={`h-full ${m.metric.status === 'ON_TRACK' ? 'bg-teal-500' : m.metric.status === 'AT_RISK' ? 'bg-amber-500' : 'bg-red-500'}`} 
                    style={{ width: `${m.metric.achievement_pct}%` }} 
                  />
                </div>
                <span className="text-xs font-mono text-neutral-500">{m.metric.target}{m.metric.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Decision Breakdown */}
        <div className="col-span-4 border border-neutral-800 bg-[#0c0c12] p-6">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-500" />
            Decision Routing Today
          </h3>
          <div className="text-4xl font-mono text-white mb-6 border-b border-neutral-800 pb-4">
            {metrics.decision_breakdown.total_decisions_today.toLocaleString()}
            <span className="text-sm text-neutral-500 ml-2">TOTAL DECISIONS</span>
          </div>
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center text-teal-400">
              <span>AUTONOMOUS EXEC</span>
              <span>{metrics.decision_breakdown.autonomous_execution.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-teal-500">
              <span>AGENT APPROVED</span>
              <span>{metrics.decision_breakdown.agent_approved.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-amber-500">
              <span>AI RECOMMENDED</span>
              <span>{metrics.decision_breakdown.ai_recommended.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-red-500">
              <span>HUMAN DECISION</span>
              <span>{metrics.decision_breakdown.human_decision.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-500 border-t border-neutral-800 pt-2 mt-2">
              <span>BOARD DECISION</span>
              <span>{metrics.decision_breakdown.board_decision.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="col-span-8 border border-neutral-800 bg-[#0c0c12] p-6">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-500" />
            Agent Fleet Status
          </h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500 uppercase font-mono border-b border-neutral-800">
              <tr>
                <th className="text-left pb-3 font-normal">Agent</th>
                <th className="text-left pb-3 font-normal">Status</th>
                <th className="text-right pb-3 font-normal">Level</th>
                <th className="text-right pb-3 font-normal">Tasks (Today)</th>
                <th className="text-right pb-3 font-normal">Success</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {metrics.active_agents.map(agent => (
                <tr key={agent.agent_id} className="border-b border-neutral-800/50">
                  <td className="py-3 text-white">{agent.name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 text-xs ${agent.status === 'ACTIVE' ? 'bg-teal-900/30 text-teal-400 border border-teal-900' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-xs text-neutral-400">{agent.autonomy_level}</td>
                  <td className="py-3 text-right">{agent.tasks_today.toLocaleString()}</td>
                  <td className="py-3 text-right text-teal-500">{(agent.success_rate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
