import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { task_id, context } = await req.json()
    // TODO: Implement Fraud agent logic (LLM integration)
    
    return new Response(
      JSON.stringify({ status: "success", agent: "fraud", task_id }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
