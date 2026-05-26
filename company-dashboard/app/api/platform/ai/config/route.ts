import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AIConfiguration } from "@/types/platform-contracts";

/**
 * BFF: GET /api/platform/ai/config
 * Returns current AI orchestration configuration.
 * Requires: AI_OPERATOR, PLATFORM_ADMIN, or SUPER_ADMIN role.
 *
 * BFF: PATCH /api/platform/ai/config
 * Updates AI routing weights and active model.
 * Requires: SUPER_ADMIN or AI_OPERATOR role.
 */
const AI_READ_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "AI_OPERATOR", "READONLY_AUDITOR"];
const AI_WRITE_ROLES = ["SUPER_ADMIN", "AI_OPERATOR"];

export async function GET(request: NextRequest) {
  const adminRole = request.headers.get("x-reverso-admin-role");
  if (!adminRole || !AI_READ_ROLES.includes(adminRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_configurations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No AI configuration found" }, { status: 404 });
  }

  const config: AIConfiguration = {
    activeModelName: data.active_model_name,
    fallbackModelName: data.fallback_model_name ?? "gpt-4o-mini",
    semanticWeight: data.semantic_weight,
    keywordWeight: data.keyword_weight,
    bm25Weight: data.bm25_weight,
    updatedAt: data.updated_at,
  };

  return NextResponse.json(config);
}

export async function PATCH(request: NextRequest) {
  const adminRole = request.headers.get("x-reverso-admin-role");
  const adminId = request.headers.get("x-reverso-admin-id");

  if (!adminRole || !AI_WRITE_ROLES.includes(adminRole) || !adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Validate weights sum to ~1.0
  const { semanticWeight, keywordWeight, bm25Weight } = body;
  if (semanticWeight !== undefined && keywordWeight !== undefined && bm25Weight !== undefined) {
    const total = semanticWeight + keywordWeight + bm25Weight;
    if (Math.abs(total - 1.0) > 0.01) {
      return NextResponse.json(
        { error: "Weights must sum to 1.0" },
        { status: 422 }
      );
    }
  }

  const supabase = await createSupabaseServerClient();

  // Fetch existing config id
  const { data: existing } = await supabase
    .from("ai_configurations")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: adminId };
  if (body.activeModelName) updatePayload.active_model_name = body.activeModelName;
  if (body.fallbackModelName) updatePayload.fallback_model_name = body.fallbackModelName;
  if (semanticWeight !== undefined) updatePayload.semantic_weight = semanticWeight;
  if (keywordWeight !== undefined) updatePayload.keyword_weight = keywordWeight;
  if (bm25Weight !== undefined) updatePayload.bm25_weight = bm25Weight;

  if (existing?.id) {
    await supabase.from("ai_configurations").update(updatePayload).eq("id", existing.id);
  } else {
    await supabase.from("ai_configurations").insert(updatePayload);
  }

  return NextResponse.json({ success: true });
}
