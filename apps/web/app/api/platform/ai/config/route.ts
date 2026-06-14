/**
 * BFF: GET /api/platform/ai/config
 * Returns current AI orchestration configuration.
 * Requires: AI_OPERATOR, PLATFORM_ADMIN, or SUPER_ADMIN role.
 *
 * BFF: PATCH /api/platform/ai/config
 * Updates AI routing weights and active model.
 * Requires: SUPER_ADMIN or AI_OPERATOR role.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, forbidden, notFound, badRequest, internalError, validationError } from '@/lib/api-response';
import type { AIConfiguration } from '@/types/platform-contracts';

const AI_READ_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'AI_OPERATOR', 'READONLY_AUDITOR'];
const AI_WRITE_ROLES = ['SUPER_ADMIN', 'AI_OPERATOR'];

const patchSchema = z.object({
  activeModelName: z.string().optional(),
  fallbackModelName: z.string().optional(),
  semanticWeight: z.number().min(0).max(1).optional(),
  keywordWeight: z.number().min(0).max(1).optional(),
  bm25Weight: z.number().min(0).max(1).optional(),
});

export async function GET(request: NextRequest) {
  const { success } = await rateLimit(request, { limit: 100, windowMs: 60_000 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const adminRole = request.headers.get('x-reverso-admin-role');
  if (!adminRole || !AI_READ_ROLES.includes(adminRole)) {
    return forbidden();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return notFound('No AI configuration found');
    }

    const config: AIConfiguration = {
      activeModelName: data.active_model_name,
      fallbackModelName: data.fallback_model_name ?? 'gpt-4o-mini',
      semanticWeight: data.semantic_weight,
      keywordWeight: data.keyword_weight,
      bm25Weight: data.bm25_weight,
      updatedAt: data.updated_at,
    };

    return ok(config);
  } catch (err) {
    return internalError(err);
  }
}

export async function PATCH(request: NextRequest) {
  const { success } = await rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const adminRole = request.headers.get('x-reverso-admin-role');
  const adminId = request.headers.get('x-reverso-admin-id');

  if (!adminRole || !AI_WRITE_ROLES.includes(adminRole) || !adminId) {
    return forbidden();
  }

  try {
    const rawBody = await request.json();
    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) return validationError(parsed.error);

    const body = parsed.data;

    // Validate weights sum to ~1.0 when all three are provided
    const { semanticWeight, keywordWeight, bm25Weight } = body;
    if (semanticWeight !== undefined && keywordWeight !== undefined && bm25Weight !== undefined) {
      const total = semanticWeight + keywordWeight + bm25Weight;
      if (Math.abs(total - 1.0) > 0.01) {
        return badRequest('Weights must sum to 1.0', { total });
      }
    }

    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from('ai_configurations')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    };
    if (body.activeModelName) updatePayload.active_model_name = body.activeModelName;
    if (body.fallbackModelName) updatePayload.fallback_model_name = body.fallbackModelName;
    if (semanticWeight !== undefined) updatePayload.semantic_weight = semanticWeight;
    if (keywordWeight !== undefined) updatePayload.keyword_weight = keywordWeight;
    if (bm25Weight !== undefined) updatePayload.bm25_weight = bm25Weight;

    if (existing?.id) {
      await supabase.from('ai_configurations').update(updatePayload).eq('id', existing.id);
    } else {
      await supabase.from('ai_configurations').insert(updatePayload);
    }

    return ok({ success: true });
  } catch (err) {
    return internalError(err);
  }
}
