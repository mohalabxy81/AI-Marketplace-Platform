/**
 * Supabase Browser Client — @marketplace/db
 *
 * Singleton browser client for client-side usage.
 * Uses NEXT_PUBLIC env vars available in browser context.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton pattern — re-use across renders to avoid multiple GoTrue instances
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

// Convenience alias
export const getSupabaseBrowserClient = createSupabaseBrowserClient;
