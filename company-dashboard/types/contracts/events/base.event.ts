export interface DomainEvent<T = unknown> {
  eventId: string;          // UUID — deduplication key
  eventType: string;        // e.g., "listing.created"
  schemaVersion: number;    // monotonic version
  producerDomain: string;   // e.g., "marketplace"
  tenantId: string | null;  // company_id — partition key (null for global events)
  actorId: string | null;   // user who triggered (null for system events)
  timestamp: string;        // ISO 8601
  correlationId: string;    // trace across saga steps
  payload: T;               // domain-specific payload
  metadata: {
    source: "api" | "system" | "saga" | "webhook";
    environment: "production" | "staging" | "development" | "test";
  };
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;
