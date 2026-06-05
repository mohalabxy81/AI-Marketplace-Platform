import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { action, company_id, experiment_id, user_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'assign_variant' && experiment_id && user_id) {
      // Dummy logic to randomly assign a variant
      const { data: variants } = await supabase
        .from('experiment_variants')
        .select('id, allocation_percent')
        .eq('experiment_id', experiment_id)
        
      if (!variants || variants.length === 0) {
        throw new Error("No variants found for experiment")
      }
      
      // Select first variant as fallback (real logic would use weighted random)
      const variant_id = variants[0].id
      
      const { error } = await supabase
        .from('ab_assignments')
        .upsert({
          experiment_id,
          variant_id,
          user_id,
          company_id,
        }, { onConflict: 'experiment_id, user_id' })
        
      if (error) throw error
      
      return new Response(
        JSON.stringify({ status: "success", variant_id }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ status: "success", message: "Experiment Manager Running", action }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
})
