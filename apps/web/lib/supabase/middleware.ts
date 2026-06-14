import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredCapabilityForRoute, hasAdminCapability } from "@/lib/supabase/admin-permissions";
import { type AdminRole } from "@/types/super-admin/admin";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login");
  const isDashboardRoute = pathname.startsWith("/dashboard") ||
    pathname.startsWith("/overview") ||
    pathname.startsWith("/listings") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/ui-customization") ||
    pathname.startsWith("/settings");

  // 1. REVERSO DASHBOARD / SUPER-ADMIN ROUTE GUARD
  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    // Query the database for administrative mappings
    const { data: adminRecord, error } = await supabase
      .from("platform_admins")
      .select("role, is_active")
      .eq("user_id", user.id)
      .single();

    if (error || !adminRecord || !adminRecord.is_active) {
      const url = request.nextUrl.clone();
      url.pathname = "/403";
      return NextResponse.redirect(url);
    }

    // Verify dynamic capability required for route
    const requiredCapability = getRequiredCapabilityForRoute(pathname);
    if (requiredCapability) {
      const hasCap = hasAdminCapability(adminRecord.role as AdminRole, requiredCapability);
      if (!hasCap) {
        const url = request.nextUrl.clone();
        url.pathname = "/403";
        return NextResponse.redirect(url);
      }
    }

    // Inject secure identity metadata headers
    request.headers.set("x-reverso-admin-role", adminRecord.role);
    request.headers.set("x-reverso-admin-id", user.id);
    
    // Create new response with modified headers
    supabaseResponse = NextResponse.next({ request });
    supabaseResponse.headers.set("x-reverso-admin-role", adminRecord.role);
    supabaseResponse.headers.set("x-reverso-admin-id", user.id);
    return supabaseResponse;
  }

  // 2. B2B TENANT ROUTE GUARD
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isDashboardRoute) {
    // Resolve Tenant Context
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (!userError && userData?.company_id) {
      // Resolve Plan Tier
      const { data: subData } = await supabase
        .from("tenant_subscriptions")
        .select("plan_id")
        .eq("company_id", userData.company_id)
        .eq("status", "active")
        .single();

      const planTier = subData?.plan_id || "plan_free";

      // Inject TenantContext headers for downstream consumption
      request.headers.set("x-tenant-id", userData.company_id);
      request.headers.set("x-user-role", userData.role);
      request.headers.set("x-plan-tier", planTier);

      supabaseResponse = NextResponse.next({ request });
      supabaseResponse.headers.set("x-tenant-id", userData.company_id);
      supabaseResponse.headers.set("x-user-role", userData.role);
      supabaseResponse.headers.set("x-plan-tier", planTier);
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
