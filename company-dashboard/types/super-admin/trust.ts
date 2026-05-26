// types/super-admin/trust.ts

export type ModerationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";

export type ModerationActionTaken = "ban" | "suspend" | "warning" | "clear";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface ModerationQueue {
  id: string;
  company_id: string;
  target_type: string; // 'listing' | 'user'
  target_id: string;
  priority: ModerationPriority;
  status: ModerationStatus;
  risk_score: number;
  reports_count: number;
  details: Record<string, unknown>;
  assigned_to: string | null; // PlatformAdmin ID
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  id: string;
  queue_item_id: string;
  action_taken: ModerationActionTaken;
  actor_id: string; // PlatformAdmin ID
  justification: string;
  created_at: string;
}

export interface FraudScore {
  id: string;
  company_id: string;
  user_id: string;
  score: number;
  flags: string[];
  created_at: string;
}

export interface TrustVerification {
  id: string;
  company_id: string;
  status: VerificationStatus;
  verification_type: string; // 'kyb' | 'domain' | 'tax_id'
  document_url: string | null;
  verified_at: string | null;
  verified_by: string | null; // PlatformAdmin ID
  created_at: string;
}
