/**
 * BFF: GET /api/platform/moderation/queue
 * Returns the moderation queue for Super Admin review.
 * Requires: MODERATOR, TRUST_AND_SAFETY, PLATFORM_ADMIN, or SUPER_ADMIN role.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { ok, forbidden, internalError, validationError } from '@/lib/api-response';
import type { ModerationQueueItem, PaginatedResult } from '@/types/platform-contracts';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'TRUST_AND_SAFETY'];

const querySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: NextRequest) {
  const { success } = await rateLimit(request, { limit: 120, windowMs: 60_000 });
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const adminRole = request.headers.get('x-reverso-admin-role');
  if (!adminRole || !ALLOWED_ROLES.includes(adminRole)) {
    return forbidden();
  }

  const rawParams = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) return validationError(parsed.error);

  const { status, priority, page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('moderation_queues')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    const result: PaginatedResult<ModerationQueueItem> = {
      data: (data || []).map((row) => ({
        id: row.id,
        tenantId: row.company_id,
        targetType: row.target_type,
        targetId: row.target_id,
        priority: row.priority,
        status: row.status,
        riskScore: row.risk_score,
        createdAt: row.created_at,
      })),
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > offset + pageSize,
    };

    return ok(result, { page, pageSize, total: count || 0 });
  } catch (err) {
    return internalError(err);
  }
}
