import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { action, company_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'calculate_mrr' && company_id) {
      // Dummy logic for MRR calculation
      const dateStr = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('mrr_snapshots')
        .upsert({
          company_id,
          snapshot_date: dateStr,
          total_mrr: 54000.00,
          total_arr: 648000.00,
          new_mrr: 2000.00,
          expansion_mrr: 500.00,
          churned_mrr: 200.00,
          total_customers: 120,
          arpu: 450.00
        }, { onConflict: 'company_id, snapshot_date' })
        
      if (error) throw error
      
      return new Response(
        JSON.stringify({ status: "success", message: "MRR calculated" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ status: "success", message: "Revenue Calculator Running", action }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
})
