/**
 * Environment Variable Schema — @marketplace/config
 *
 * Validates all required env vars at startup.
 * Prevents silent failures from missing configuration.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Supabase — required in all environments
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Optional — Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Optional — AI
  OPENAI_API_KEY: z.string().optional(),

  // Optional — Rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables.
 * Call once at app startup to catch config errors early.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. Check server logs for details.');
  }
  return result.data;
}

/**
 * Pre-validated env (call validateEnv() first in app entry points).
 * Use this for safe access to env vars with types.
 */
export const env = envSchema.parse(process.env);
