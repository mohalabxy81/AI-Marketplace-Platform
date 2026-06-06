/**
 * Next.js Root Middleware — Multi-Tenant Auth Claims Resolver
 *
 * This is the kernel-space entrypoint for every HTTP request.
 * It runs on the Edge before any page or API handler executes.
 *
 * RESPONSIBILITIES
 * ─────────────────
 *  1. Refresh the Supabase session cookie (required by @supabase/ssr).
 *  2. Guard Super-Admin routes: verify role + capability via platform_admins.
 *  3. Guard Tenant Dashboard routes: resolve tenant context and inject
 *     standardised x-tenant-* headers consumed by Server Components and
 *     API route handlers (avoids repeated DB round-trips per component).
 *  4. Redirect unauthenticated users to /login.
 *
 * HEADERS INJECTED (downstream)
 * ─────────────────────────────
 *  x-tenant-id       — company UUID (partition key for all DB queries)
 *  x-user-role       — tenant-scoped role: OWNER | MANAGER | AGENT | VIEWER
 *  x-plan-tier       — billing plan ID, e.g. 'plan_free' | 'plan_enterprise'
 *  x-tenant-tps      — allocated_tps from the JWT tenant_context claim
 *  x-reverso-admin-role — (super-admin routes only) RBAC role string
 *  x-reverso-admin-id   — (super-admin routes only) admin user UUID
 *
 * VERIFY
 * ──────
 *  - Request with valid tenant JWT → headers injected, page renders.
 *  - Request with invalid/missing token → redirected to /login.
 *  - Super-admin request without admin record → redirected to /403.
 *  - Super-admin request lacking required capability → redirected to /403.
 */

import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (compiled assets)
     *  - _next/image   (image optimisation pipeline)
     *  - favicon.ico   (browser favicon request)
     *  - Static image extensions handled by Next.js image loader
     *
     * This ensures the middleware runs on every dynamic route,
     * API handler, and Server Component request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
