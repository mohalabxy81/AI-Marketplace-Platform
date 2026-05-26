import { DomainEvent } from "./base.event";

export interface EmbeddingGeneratedPayload {
  listingId: string;
  modelName: string;
  latencyMs: number;
}

export interface RecommendationGeneratedPayload {
  userId: string;
  listingIds: string[];
  modelName: string;
  experimentId?: string;
}

export interface ExperimentActivatedPayload {
  experimentId: string;
  splitPercentage: number;
}

export type EmbeddingGeneratedEvent = DomainEvent<EmbeddingGeneratedPayload>;
export type RecommendationGeneratedEvent = DomainEvent<RecommendationGeneratedPayload>;
export type ExperimentActivatedEvent = DomainEvent<ExperimentActivatedPayload>;
