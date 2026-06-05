import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { action, transaction_id } = await req.json()
    
    // Evaluate risk score for the transaction
    return new Response(
      JSON.stringify({ status: "success", agent: "fraud", action, transaction_id, risk_score: 0.12, decision: "approved" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
})
