import { DomainEvent } from "./base.event";
import { ModerationPriority, ModerationActionTaken, VerificationStatus } from "../../super-admin/trust";

export interface ModerationItemQueuedPayload {
  itemId: string;
  targetType: "listing" | "user";
  priority: ModerationPriority;
  riskScore: number;
}

export interface ModerationActionTakenPayload {
  itemId: string;
  targetType: "listing" | "user";
  action: ModerationActionTaken;
  actorId: string;
  justification: string;
}

export interface FraudDetectedPayload {
  userId: string;
  companyId: string;
  score: number;
  flags: string[];
}

export interface TrustVerifiedPayload {
  companyId: string;
  verificationType: "kyb" | "domain" | "tax_id";
  status: VerificationStatus;
}

export type ModerationItemQueuedEvent = DomainEvent<ModerationItemQueuedPayload>;
export type ModerationActionTakenEvent = DomainEvent<ModerationActionTakenPayload>;
export type FraudDetectedEvent = DomainEvent<FraudDetectedPayload>;
export type TrustVerifiedEvent = DomainEvent<TrustVerifiedPayload>;
