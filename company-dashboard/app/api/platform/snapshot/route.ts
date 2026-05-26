import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlatformSnapshot } from "@/types/platform-contracts";

/**
 * BFF: GET /api/platform/snapshot
 * Aggregates global platform KPIs for the Super Admin dashboard.
 * Requires: x-reverso-admin-role header set by middleware.
 */
export async function GET(request: NextRequest) {
  const adminRole = request.headers.get("x-reverso-admin-role");
  if (!adminRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: snapshot, error } = await supabase
      .from("analytics_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !snapshot) {
      // Return a zeroed snapshot if none exists yet
      const empty: PlatformSnapshot = {
        totalMrr: 0,
        totalTenants: 0,
        activeTenants: 0,
        openTickets: 0,
        moderationQueueDepth: 0,
        snapshotDate: new Date().toISOString().split("T")[0],
      };
      return NextResponse.json(empty);
    }

    const result: PlatformSnapshot = {
      totalMrr: snapshot.total_mrr,
      totalTenants: snapshot.total_tenants,
      activeTenants: snapshot.active_tenants,
      openTickets: snapshot.open_tickets,
      moderationQueueDepth: snapshot.moderation_queue_depth,
      snapshotDate: snapshot.snapshot_date,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[BFF /api/platform/snapshot]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
