/* eslint-disable @typescript-eslint/no-unused-vars */
import { DomainEvent, EventHandler } from "@/types/contracts/events/base.event";
import { createClient } from "@supabase/supabase-js";

/**
 * Hybrid Event Bus Strategy:
 * 1. Local (In-process): Fast synchronous and async execution of handlers.
 * 2. Realtime (Supabase): Fan-out across instances and client subscriptions.
 */
class EventBusService {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private supabaseClient: ReturnType<typeof createClient> | null = null;
  private readonly channelName = "platform-events";

  constructor() {
    // Optionally initialize Supabase client for realtime fanout if environment variables are available.
    // In Edge environments, this may be injected or lazily loaded.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && typeof window === "undefined") {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.setupRealtimeSubscription();
    }
  }

  private setupRealtimeSubscription() {
    if (!this.supabaseClient) return;

    this.supabaseClient
      .channel(this.channelName)
      .on("broadcast", { event: "*" }, (payload) => {
        const eventType = payload.event;
        const domainEvent = payload.payload as DomainEvent;
        this.executeHandlers(eventType, domainEvent, true); // true = from realtime
      })
      .subscribe();
  }

  /**
   * Subscribe to a specific event type.
   */
  public subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlersSet = this.handlers.get(eventType)!;
    handlersSet.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlersSet.delete(handler as EventHandler);
    };
  }

  /**
   * Publish an event locally and (optionally) broadcast via Supabase Realtime.
   */
  public async publish<T = unknown>(event: DomainEvent<T>): Promise<void> {
    // 1. Execute local handlers synchronously/asynchronously
    await this.executeHandlers(event.eventType, event, false);

    // 2. Broadcast to Realtime if initialized
    if (this.supabaseClient) {
      this.supabaseClient.channel(this.channelName).send({
        type: "broadcast",
        event: event.eventType,
        payload: event,
      });
    }
  }

  /**
   * Execute handlers for a given event type.
   */
  private async executeHandlers(eventType: string, event: DomainEvent, _isFromRealtime: boolean): Promise<void> {
    const handlersSet = this.handlers.get(eventType);
    const wildcardHandlers = this.handlers.get("*");

    const allHandlers = new Set<EventHandler>();
    if (handlersSet) handlersSet.forEach(h => allHandlers.add(h));
    if (wildcardHandlers) wildcardHandlers.forEach(h => allHandlers.add(h));

    const executions = Array.from(allHandlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler failed for event ${eventType}`, error);
        // In a full implementation, send to Dead Letter Queue (DLQ)
      }
    });

    await Promise.allSettled(executions);
  }
}

export const eventBus = new EventBusService();
