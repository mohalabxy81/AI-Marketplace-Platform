import { DomainEvent } from "./base.event";
import { ListingType, ListingStatus } from "@/types/database";

// Base interface for all marketplace events
export interface MarketplaceEventPayload {
  listingId: string;
}

export interface ListingCreatedPayload extends MarketplaceEventPayload {
  type: ListingType;
  category: string;
  title: string;
}

export interface ListingUpdatedPayload extends MarketplaceEventPayload {
  changedFields: string[];
}

export interface ListingStatusChangedPayload extends MarketplaceEventPayload {
  oldStatus: ListingStatus;
  newStatus: ListingStatus;
}

export interface ListingInteractionPayload extends MarketplaceEventPayload {
  userId: string;
  action: "view" | "click" | "save" | "share" | "contact" | "purchase";
  durationSeconds?: number;
}

// Type aliases for the fully constructed DomainEvent
export type ListingCreatedEvent = DomainEvent<ListingCreatedPayload>;
export type ListingUpdatedEvent = DomainEvent<ListingUpdatedPayload>;
export type ListingStatusChangedEvent = DomainEvent<ListingStatusChangedPayload>;
export type ListingInteractionEvent = DomainEvent<ListingInteractionPayload>;
