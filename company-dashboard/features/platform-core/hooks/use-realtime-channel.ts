"use client";

import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Type definitions ──────────────────────────────────────────────────────

export type RealtimeTopicType = "tenant_feed" | "tenant_moderation" | "platform_global";

export interface RealtimeMessage<T = unknown> {
  event: string;
  payload: T;
  receivedAt: Date;
}

export interface UseRealtimeChannelOptions<T = unknown> {
  /** Tenant UUID — used to scope the channel to a specific company. Required unless topicType is 'platform_global'. */
  tenantId?: string;
  /** The type of channel to subscribe to. */
  topicType: RealtimeTopicType;
  /** Called each time a matching broadcast event arrives. */
  onMessage: (message: RealtimeMessage<T>) => void;
  /** Optional: filter to a specific broadcast event name. Defaults to '*' (all events on the channel). */
  eventFilter?: string;
  /** Whether the subscription should be active. Defaults to true. Set to false to pause. */
  enabled?: boolean;
}

// ── Supabase client singleton (browser-safe) ──────────────────────────────
// A single shared client reuses one persistent WebSocket connection for
// all channels, avoiding per-hook connection overhead.
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _browserClient: ReturnType<typeof createClient> | null = null;

function getBrowserClient() {
  if (!_browserClient) {
    _browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}

// ── Channel topic builders ────────────────────────────────────────────────

function buildChannelTopic(topicType: RealtimeTopicType, tenantId?: string): string {
  switch (topicType) {
    case "tenant_feed":
      if (!tenantId) throw new Error("[useRealtimeChannel] tenantId is required for topic 'tenant_feed'.");
      return `tenant_feed:${tenantId}`;

    case "tenant_moderation":
      if (!tenantId) throw new Error("[useRealtimeChannel] tenantId is required for topic 'tenant_moderation'.");
      return `tenant_moderation:${tenantId}`;

    case "platform_global":
      return "platform:global";

    default:
      throw new Error(`[useRealtimeChannel] Unknown topic type: ${topicType as string}`);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * useRealtimeChannel
 *
 * Subscribes to a Supabase Realtime broadcast channel and delivers structured
 * messages to the caller via `onMessage`.
 *
 * CHANNEL TOPOLOGY (matches docs/architecture-specifications.md §2)
 * ─────────────────────────────────────────────────────────────────
 *  tenant_feed:<tenantId>        — ranking_completed events (live feed updates)
 *  tenant_moderation:<tenantId>  — fraud_detected events  (moderation alerts)
 *  platform:global               — platform-wide maintenance / alert broadcasts
 *
 * LIFECYCLE
 * ─────────
 *  • Subscribes on mount (or when `enabled` flips to true).
 *  • Unsubscribes and removes the channel on unmount (or when `enabled` becomes false).
 *  • If `tenantId` or `topicType` changes, the old channel is removed and a new one created.
 *
 * VERIFY
 * ──────
 *  1. Publish a mock `ranking_completed` broadcast to `tenant_feed:<tenantId>`.
 *     → `onMessage` must be called with the event payload within ~100 ms.
 *  2. Publish a `fraud_detected` broadcast to `tenant_moderation:<tenantId>`.
 *     → `onMessage` must be called for subscribers using topicType='tenant_moderation'.
 *  3. Unmount the component.
 *     → The Supabase channel must be removed (no lingering subscriptions in debug panel).
 *
 * @example
 * ```tsx
 * useRealtimeChannel<RankingCompletedPayload>({
 *   tenantId: company.id,
 *   topicType: "tenant_feed",
 *   eventFilter: "ranking_completed",
 *   onMessage: ({ payload }) => updateFeed(payload),
 * });
 * ```
 */
export function useRealtimeChannel<T = unknown>({
  tenantId,
  topicType,
  onMessage,
  eventFilter = "*",
  enabled = true,
}: UseRealtimeChannelOptions<T>) {
  // Stable ref so the subscription callback never captures a stale closure.
  const onMessageRef = useRef(onMessage);
  useLayoutEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
    const supabase = getBrowserClient();
    const topic = buildChannelTopic(topicType, tenantId);

    const channel = supabase
      .channel(topic)
      .on(
        "broadcast",
        { event: eventFilter },
        (broadcastPayload) => {
          onMessageRef.current({
            event: broadcastPayload.event ?? eventFilter,
            payload: broadcastPayload.payload as T,
            receivedAt: new Date(),
          });
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[useRealtimeChannel] ${topic} → ${status}`);
        }
      });

    channelRef.current = channel;
  }, [topicType, tenantId, eventFilter]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      getBrowserClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      unsubscribe();
      return;
    }

    subscribe();
    return unsubscribe;
  }, [enabled, subscribe, unsubscribe]);
}

// ── Convenience wrappers ──────────────────────────────────────────────────

/** Subscribe to live feed re-ranking updates for a specific tenant. */
export function useTenantFeedChannel<T = unknown>(
  tenantId: string,
  onMessage: (msg: RealtimeMessage<T>) => void,
  enabled = true
) {
  return useRealtimeChannel<T>({
    tenantId,
    topicType: "tenant_feed",
    eventFilter: "ranking_completed",
    onMessage,
    enabled,
  });
}

/** Subscribe to real-time moderation / fraud alerts for a specific tenant. */
export function useTenantModerationChannel<T = unknown>(
  tenantId: string,
  onMessage: (msg: RealtimeMessage<T>) => void,
  enabled = true
) {
  return useRealtimeChannel<T>({
    tenantId,
    topicType: "tenant_moderation",
    eventFilter: "fraud_detected",
    onMessage,
    enabled,
  });
}

/** Subscribe to platform-wide broadcast alerts (maintenance, system status). */
export function usePlatformAlertChannel<T = unknown>(
  onMessage: (msg: RealtimeMessage<T>) => void,
  enabled = true
) {
  return useRealtimeChannel<T>({
    topicType: "platform_global",
    eventFilter: "alert",
    onMessage,
    enabled,
  });
}
