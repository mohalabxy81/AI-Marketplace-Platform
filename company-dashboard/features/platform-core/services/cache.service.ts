import { eventBus } from "./event-bus.service";

/**
 * Cache Strategy:
 * Phase 1: In-memory mapping (suitable for single-instance or short-lived edge functions).
 * Phase 2: Redis (Upstash) for global distributed caching.
 */
class CacheService {
  private memoryCache = new Map<string, { value: any; expiry: number }>();

  constructor() {
    // 1. Listen for listing events to invalidate feed/search caches
    eventBus.subscribe("listing.created", this.handleListingChange.bind(this));
    eventBus.subscribe("listing.updated", this.handleListingChange.bind(this));
    eventBus.subscribe("listing.status_changed", this.handleListingChange.bind(this));
  }

  /**
   * Event-driven invalidation handler
   */
  private async handleListingChange(event: any) {
    const tenantId = event.tenantId;
    if (tenantId) {
      // Invalidate the feed cache for this tenant
      this.invalidatePattern(`feed:${tenantId}:*`);
      this.invalidatePattern(`search:${tenantId}:*`);
    }
  }

  /**
   * Get an item from the cache.
   */
  public async get<T>(key: string): Promise<T | null> {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set an item in the cache with a TTL (seconds).
   */
  public async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value, expiry });
  }

  /**
   * Delete an item from the cache.
   */
  public async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  /**
   * Invalidates all keys matching a prefix.
   */
  public async invalidatePattern(prefix: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }
    
    // If using Redis, this would be a SCAN and DEL or using tags
  }

  /**
   * Helper to fetch-or-cache.
   */
  public async fetchOrCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

export const cacheService = new CacheService();
