/**
 * Supabase Server Client — @marketplace/db
 *
 * Server-side client using cookie-based session management.
 * Must only be called in Server Components, API Routes, or Server Actions.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components with read-only cookies
          }
        },
      },
    }
  );
}

// Alias for compatibility across codebase
export const getSupabaseServerClient = createSupabaseServerClient;

/**
 * Service role client — bypasses RLS.
 * ONLY use in server-side admin operations or trusted background jobs.
 * NEVER expose to client-side code.
 */
export async function createSupabaseServiceRoleClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
