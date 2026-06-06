"use client"

import { useState, useEffect, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Power, ShieldAlert, Bot } from "lucide-react"

export function AutonomousControlPanel() {
  const [agents, setAgents] = useState<any[]>([])
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false)
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    const fetchData = async () => {
      // Fetch kill switches
      const { data: killData } = await supabase
        .from('kill_switches')
        .select('*')
        .eq('system_name', 'all_agents')
        .single()
        
      if (killData) {
        setGlobalKillSwitch(killData.is_triggered)
      }

      // Fetch policies (agents)
      const { data: policiesData } = await supabase
        .from('automation_policies')
        .select('*')
        
      if (policiesData && policiesData.length > 0) {
        setAgents(policiesData)
      } else {
        setAgents([
          { agent_type: 'Support Agent', is_active: true, risk_threshold: 0.2, max_amount_usd: 50 },
          { agent_type: 'Fraud Agent', is_active: true, risk_threshold: 0.05, max_amount_usd: null },
          { agent_type: 'Moderation Agent', is_active: true, risk_threshold: 0.1, max_amount_usd: null },
          { agent_type: 'Growth Agent', is_active: false, risk_threshold: 0.4, max_amount_usd: 500 },
        ])
      }
    }
    
    fetchData()
  }, [supabase])

  const toggleGlobalKillSwitch = async () => {
    const newValue = !globalKillSwitch
    setGlobalKillSwitch(newValue)
    
    await supabase
      .from('kill_switches')
      .update({ is_triggered: newValue, triggered_at: new Date().toISOString() })
      .eq('system_name', 'all_agents')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Autonomous Fleet Control</h2>
          <p className="text-muted-foreground">Manage agent policies, human-in-the-loop thresholds, and emergency overrides.</p>
        </div>
        <button
          onClick={toggleGlobalKillSwitch}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-colors ${globalKillSwitch ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'}`}
        >
          <Power className="w-5 h-5" />
          {globalKillSwitch ? 'RESTORE AGENTS' : 'GLOBAL KILL SWITCH'}
        </button>
      </div>

      {globalKillSwitch && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <h4 className="text-red-500 font-bold">SYSTEM OVERRIDE ACTIVE</h4>
            <p className="text-red-400 text-sm">All autonomous actions have been suspended. Agents will only generate drafts and require explicit human approval for all actions.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent, idx) => (
          <Card key={idx} className={!agent.is_active || globalKillSwitch ? "opacity-60" : "border-teal-500/30"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-teal-500" />
                  {agent.agent_type}
                </CardTitle>
                <div className={`px-2 py-1 rounded text-xs font-bold ${agent.is_active && !globalKillSwitch ? 'bg-teal-500/20 text-teal-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  {agent.is_active && !globalKillSwitch ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Autonomy Threshold (Risk)</span>
                  <span className="font-medium text-amber-500">&lt; {agent.risk_threshold * 100}%</span>
                </div>
                {agent.max_amount_usd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Financial Impact</span>
                    <span className="font-medium">${agent.max_amount_usd}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
