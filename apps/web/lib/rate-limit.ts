/**
 * Rate Limiting — apps/web
 *
 * In-memory sliding window rate limiter for API routes.
 * For production, replace with Upstash Redis (@upstash/ratelimit).
 *
 * Usage:
 *   const result = await rateLimit(req, { limit: 10, windowMs: 60_000 })
 *   if (!result.success) return tooManyRequests()
 */
import { NextRequest } from 'next/server';

interface RateLimitOptions {
  /** Max requests per window */
  limit?: number;
  /** Window in milliseconds */
  windowMs?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// In-memory store: key → { count, resetAt }
// For production: swap this map with Upstash Redis
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Get client identifier from request.
 * Uses x-forwarded-for if behind a proxy, otherwise falls back to 'unknown'.
 */
function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return ip;
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { limit = 60, windowMs = 60_000 } = options;

  const key = getClientId(req);
  const now = Date.now();

  const record = store.get(key);

  // Window expired or first request
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { success: true, limit, remaining: limit - record.count, resetAt: record.resetAt };
}

// Periodically clean up expired entries to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) store.delete(key);
    }
  }, 60_000);
}
