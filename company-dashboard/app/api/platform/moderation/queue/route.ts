import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ModerationQueueItem, PaginatedResult } from "@/types/platform-contracts";

/**
 * BFF: GET /api/platform/moderation/queue
 * Returns the moderation queue for Super Admin review.
 * Requires: MODERATOR, TRUST_AND_SAFETY, PLATFORM_ADMIN, or SUPER_ADMIN role.
 */
export async function GET(request: NextRequest) {
  const adminRole = request.headers.get("x-reverso-admin-role");
  const allowedRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "MODERATOR", "TRUST_AND_SAFETY"];

  if (!adminRole || !allowedRoles.includes(adminRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "PENDING";
  const priority = searchParams.get("priority");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "25");
  const offset = (page - 1) * pageSize;

  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("moderation_queues")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

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

    return NextResponse.json(result);
  } catch (err) {
    console.error("[BFF /api/platform/moderation/queue]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
