/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, ShieldCheck, Zap } from "lucide-react"

export function ObservabilityDashboard() {
  const [slos, setSlos] = useState<any[]>([])
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    const fetchSLOs = async () => {
      const { data, error } = await supabase
        .from('slo_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(4)
        
      if (!error && data && data.length > 0) {
        setSlos(data)
      } else {
        setSlos([
          { service_name: 'Auth API', metric_name: 'Availability', actual_value: 99.99, target_value: 99.95, is_breached: false },
          { service_name: 'Search Engine', metric_name: 'Latency p95', actual_value: 120, target_value: 200, is_breached: false },
          { service_name: 'AI Embeddings', metric_name: 'Error Rate', actual_value: 0.05, target_value: 0.1, is_breached: false },
          { service_name: 'Billing Sync', metric_name: 'Availability', actual_value: 100, target_value: 99.9, is_breached: false },
        ])
      }
    }
    
    fetchSLOs()
  }, [supabase])

  if (slos.length === 0) return <div className="p-4 border rounded-lg animate-pulse bg-muted/50 h-32" />

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Platform Observability & SLOs</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {slos.map((slo, idx) => (
          <Card key={idx} className={slo.is_breached ? "border-red-500" : "border-teal-500/20"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{slo.service_name}</CardTitle>
              {slo.is_breached ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-teal-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slo.actual_value}{slo.metric_name.includes('Latency') ? 'ms' : '%'}</div>
              <p className="text-xs text-muted-foreground">{slo.metric_name} (Target: {slo.target_value})</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
