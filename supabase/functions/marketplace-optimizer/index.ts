import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { action, company_id, listing_id } = await req.json()
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'score_listing' && listing_id && company_id) {
      // Dummy logic for scoring a listing
      const completeness = 0.85
      const trust = 0.90
      const engagement = 0.50
      const freshness = 1.00
      const ai = 0.70
      
      const composite = (0.2 * completeness) + (0.25 * trust) + (0.25 * engagement) + (0.15 * freshness) + (0.15 * ai)
      
      const { error } = await supabase
        .from('listing_scores')
        .upsert({
          listing_id,
          company_id,
          completeness_score: completeness,
          trust_score: trust,
          engagement_score: engagement,
          freshness_score: freshness,
          ai_enrichment_score: ai,
          quality_score: composite,
        }, { onConflict: 'listing_id' })
        
      if (error) throw error
      
      return new Response(
        JSON.stringify({ status: "success", message: "Listing scored", score: composite }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    if (action === 'calculate_kpis' && company_id) {
      // Dummy logic for KPI calculation
      const { error } = await supabase
        .from('marketplace_kpis')
        .insert({
          company_id,
          snapshot_date: new Date().toISOString().split('T')[0],
          active_listings: 10,
          active_buyers: 5,
          active_sellers: 5,
          liquidity_ratio: 1.0,
          total_matches_made: 20,
          match_rate: 0.8,
          avg_match_score: 0.75,
        })
        
      if (error && error.code !== '23505') throw error // Ignore unique constraint
      
      return new Response(
        JSON.stringify({ status: "success", message: "KPIs calculated" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ status: "success", message: "Marketplace Optimizer Running", action }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
})
