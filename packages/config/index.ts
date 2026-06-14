/**
 * @marketplace/config — Shared Configuration Package
 */
export { env, validateEnv } from './env';

// Platform-wide constants
export const PLATFORM_CONSTANTS = {
  APP_NAME: 'AI Marketplace Platform',
  DEFAULT_PAGE_SIZE: 20,
  MAX_LISTING_IMAGES: 10,
  MAX_TEAM_MEMBERS_FREE: 3,
  AI_TOKEN_LIMIT_FREE: 100_000,
  AI_TOKEN_LIMIT_PRO: 1_000_000,
  AI_TOKEN_LIMIT_ENTERPRISE: 10_000_000,
  SUPABASE_REALTIME_CHANNELS: {
    TENANT_FEED: (tenantId: string) => `tenant_feed:${tenantId}`,
    TENANT_MODERATION: (tenantId: string) => `tenant_moderation:${tenantId}`,
    PLATFORM_GLOBAL: 'platform:global',
  },
} as const;

export type PlatformConstants = typeof PLATFORM_CONSTANTS;
