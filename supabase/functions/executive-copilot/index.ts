import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { action, company_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'generate_recommendation' && company_id) {
      // Dummy logic for generating a strategic recommendation
      const { error } = await supabase
        .from('strategic_recommendations')
        .insert({
          company_id,
          category: 'cost_cutting',
          title: 'Optimize AI Inference Caching',
          description: 'High cache miss rate observed for Semantic Search. Rebuilding HNSW index and expanding redis memory cache by 2GB will reduce OpenAI API spend by $1,200/mo.',
          expected_impact_arr: 14400.00,
          cost_estimate: 150.00,
          time_to_execute: '1 week',
          confidence_score: 0.92,
          status: 'proposed'
        })
        
      if (error) throw error
      
      return new Response(
        JSON.stringify({ status: "success", message: "Recommendation generated" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ status: "success", message: "Executive Copilot Running", action }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
})
