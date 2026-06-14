/**
 * @marketplace/db — Shared Supabase Database Client Package
 *
 * Centralizes all Supabase client creation to avoid duplication
 * across apps. Exports both browser and server clients.
 */

export { createSupabaseBrowserClient } from './client';
export { createSupabaseServerClient, createSupabaseServiceRoleClient, getSupabaseServerClient } from './server';
export type { Database } from './types';
