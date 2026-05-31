import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * AI Embed Edge Function — Real-Time Vector Embeddings Generator
 *
 * Listens for listing create/update webhook events and generates
 * OpenAI vector embeddings, storing them in ai_ops.embeddings.
 *
 * Spec Reference: Spec 36, Section 8 — Real-Time Vector Embeddings
 *                 Spec 33, Section 7 — AI Embedding Architecture
 *                 PLANNER.md §7 — AI Operating Model
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()

    // Support both direct call and Supabase webhook format
    const record = payload?.record ?? payload
    const { id: listingId, tenant_id, title, description, tags, category } = record

    if (!listingId || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing listing_id or tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build normalized text for embedding
    const textToEmbed = [
      title ?? '',
      description ?? '',
      category ?? '',
      Array.isArray(tags) ? tags.join(' ') : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
      .slice(0, 8000) // OpenAI max input length guard

    if (!textToEmbed) {
      return new Response(JSON.stringify({ error: 'No text content to embed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate embedding with retry logic
    const embedding = await generateEmbeddingWithRetry(textToEmbed, MAX_RETRIES)

    if (!embedding) {
      return new Response(JSON.stringify({ error: 'Failed to generate embedding after retries' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Store embedding in Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Mark previous embeddings as stale
    await supabaseAdmin
      .from('ai_ops.embeddings')
      .update({ is_current: false })
      .eq('entity_id', listingId)
      .eq('entity_type', 'listing')

    // Insert new embedding
    const { error: insertError } = await supabaseAdmin
      .from('ai_ops.embeddings')
      .insert({
        entity_type: 'listing',
        entity_id: listingId,
        tenant_id,
        model_name: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: JSON.stringify(embedding),
        metadata: {
          source: 'ai-embed-function',
          input_length: textToEmbed.length,
        },
        is_current: true,
      })

    if (insertError) {
      console.error('[ai-embed] Insert error:', insertError.message)
      return new Response(JSON.stringify({ error: 'Failed to store embedding' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Also update the search.listing_index for hybrid search
    await supabaseAdmin
      .from('search.listing_index')
      .upsert({
        listing_id: listingId,
        tenant_id,
        title: title ?? '',
        description: description ?? '',
        category: category ?? '',
        tags: Array.isArray(tags) ? tags : [],
        status: 'active',
        indexed_at: new Date().toISOString(),
        source_updated_at: new Date().toISOString(),
      }, { onConflict: 'listing_id' })

    return new Response(
      JSON.stringify({
        success: true,
        listing_id: listingId,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const error = err as Error
    console.error('[ai-embed] Unexpected error:', error.message)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Generate OpenAI text embeddings with exponential backoff retry
 */
async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number
): Promise<number[] | null> {
  const openAIKey = Deno.env.get('OPENAI_API_KEY')
  if (!openAIKey) {
    console.error('[ai-embed] OPENAI_API_KEY not set')
    return null
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`[ai-embed] OpenAI API error (attempt ${attempt}):`, response.status, errorBody)
        if (response.status === 429 && attempt < maxRetries) {
          await delay(RETRY_DELAY_MS * Math.pow(2, attempt))
          continue
        }
        return null
      }

      const result = await response.json()
      return result?.data?.[0]?.embedding ?? null
    } catch (err) {
      const error = err as Error
      console.error(`[ai-embed] Fetch error (attempt ${attempt}):`, error.message)
      if (attempt < maxRetries) {
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt))
      }
    }
  }
  return null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
