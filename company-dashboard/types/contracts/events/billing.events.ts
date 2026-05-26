import { DomainEvent } from "./base.event";

export interface SubscriptionStatusPayload {
  companyId: string;
  planId: string;
  status: "active" | "past_due" | "canceled" | "unpaid" | "trialing";
}

export interface SubscriptionChangedPayload {
  companyId: string;
  oldPlanId: string;
  newPlanId: string;
  effectiveDate: string;
}

export interface QuotaWarningPayload {
  companyId: string;
  resource: string;
  percentUsed: number;
}

export interface QuotaExceededPayload {
  companyId: string;
  resource: string;
  limit: number;
  current: number;
}

export type SubscriptionCreatedEvent = DomainEvent<SubscriptionStatusPayload>;
export type SubscriptionUpdatedEvent = DomainEvent<SubscriptionChangedPayload>;
export type SubscriptionCanceledEvent = DomainEvent<SubscriptionStatusPayload>;
export type QuotaWarningEvent = DomainEvent<QuotaWarningPayload>;
export type QuotaExceededEvent = DomainEvent<QuotaExceededPayload>;
