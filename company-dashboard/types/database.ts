// ─────────────────────────────────────────────────────────────
// Database Types — mirrors Supabase schema exactly
// ─────────────────────────────────────────────────────────────

export type UserRole = "OWNER" | "MANAGER" | "AGENT" | "VIEWER";

export type ListingType = "real_estate" | "cars" | "products" | "services";

export type ListingStatus = "draft" | "published" | "archived" | "pending_review";

export type InteractionAction = "view" | "click" | "save" | "share";

export type InsightType = "performance" | "trend" | "warning" | "opportunity";

export type InviteStatus = "pending" | "accepted" | "rejected";

export type NotificationType = "listing" | "team" | "alert" | "system";

export type AuditLogAction = "created" | "edited" | "deleted" | "invited" | "role_changed" | "published" | "archived";

export type AuditLogEntityType = "listing" | "user" | "permission" | "system";

// ── Table row types ───────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  role: UserRole;
  created_at: string;
}

export interface DbCompany {
  id: string;
  name: string;
  logo: string | null;
  owner_id: string;
  created_at: string;
}

export interface DbListing {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  type: ListingType;
  status: ListingStatus;
  location: string | null;
  images: string[];
  tags: string[];
  created_by: string;
  created_at: string;
}

export interface DbTeamInvite {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  created_at: string;
}

export interface DbRolesPermission {
  id: string;
  company_id: string;
  role: UserRole;
  permission: string;
  allowed: boolean;
}

export interface DbUserInteraction {
  id: string;
  user_id: string;
  listing_id: string;
  company_id: string;
  action: InteractionAction;
  duration: number | null;
  created_at: string;
}

export interface DbAnalyticsSnapshot {
  id: string;
  company_id: string;
  snapshot_date: string;
  total_views: number;
  total_clicks: number;
  total_saves: number;
  total_shares: number;
  active_listings: number;
  engagement_rate: number;
  created_at: string;
}

export interface DbAiInsight {
  id: string;
  company_id: string;
  type: InsightType;
  title: string;
  body: string;
  score: number | null;
  listing_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbNotification {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  company_id: string;
  actor_id: string | null;
  action: AuditLogAction;
  entity_type: AuditLogEntityType;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbConversation {
  id: string;
  company_id: string;
  type: string;
  created_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
}

// ── Insert / Update types ─────────────────────────────────────

export type InsertUser = Omit<DbUser, "id" | "created_at">;
export type InsertCompany = Omit<DbCompany, "id" | "created_at">;
export type InsertListing = Omit<DbListing, "id" | "created_at">;
export type InsertTeamInvite = Omit<DbTeamInvite, "id" | "created_at">;
export type InsertNotification = Omit<DbNotification, "id" | "created_at">;
export type InsertAuditLog = Omit<DbAuditLog, "id" | "created_at">;
export type InsertConversation = Omit<DbConversation, "id" | "created_at">;
export type InsertMessage = Omit<DbMessage, "id" | "created_at">;

export type UpdateUser = Partial<InsertUser>;
export type UpdateCompany = Partial<InsertCompany>;
export type UpdateListing = Partial<InsertListing>;
export type UpdateNotification = Partial<InsertNotification>;
