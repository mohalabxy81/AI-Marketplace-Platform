// types/super-admin/ai.ts

export type ExperimentStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export type EmbeddingStatus = "STALE" | "INDEXING" | "COMPLETED" | "FAILED";

export interface AIConfiguration {
  id: string;
  active_model_name: string;
  semantic_weight: number;
  keyword_weight: number;
  bm25_weight: number;
  updated_at: string;
  updated_by: string | null;
}

export interface AIExperiment {
  id: string;
  name: string;
  description: string | null;
  model_a: string;
  model_b: string;
  split_percentage: number;
  status: ExperimentStatus;
  created_at: string;
  updated_at: string;
}

export interface SemanticEmbedding {
  id: string;
  listing_id: string;
  embedding_status: EmbeddingStatus;
  last_indexed_at: string | null;
}

export interface AIInferenceLog {
  id: string;
  model_name: string;
  latency_ms: number;
  tokens_used: number;
  status_code: number;
  created_at: string;
}
