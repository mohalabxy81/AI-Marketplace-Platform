/**
 * Internal Platform Service Contracts
 * These TypeScript interfaces define the strict boundaries between domains.
 * Domains MUST NOT import each other's internal implementations — only these contracts.
 */

// ─── Shared Value Types ───────────────────────────────────────────────────────

export type TenantId = string;
export type AdminId = string;
export type UserId = string;
export type ListingId = string;

export type PlanTier = "plan_free" | "plan_starter" | "plan_growth" | "plan_enterprise";

export type AdminRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT"
  | "MODERATOR"
  | "BILLING_ADMIN"
  | "ANALYTICS_ADMIN"
  | "AI_OPERATOR"
  | "TRUST_AND_SAFETY"
  | "READONLY_AUDITOR";

// ─── Platform Service Contract ────────────────────────────────────────────────

export interface IPlatformService {
  /** Fetch lightweight tenant context for middleware/BFF injection */
  getTenantContext(userId: UserId): Promise<TenantContext | null>;
  /** List all tenants for Super Admin views */
  listTenants(opts?: PaginationOpts): Promise<PaginatedResult<TenantSummary>>;
  /** Suspend or reactivate a tenant */
  setTenantStatus(tenantId: TenantId, status: "active" | "suspended", actorId: AdminId): Promise<void>;
}

export interface TenantContext {
  tenantId: TenantId;
  planTier: PlanTier;
  userRole: string;
}

export interface TenantSummary {
  id: TenantId;
  name: string;
  status: "active" | "suspended" | "trial";
  planTier: PlanTier;
  memberCount: number;
  mrr: number;
  createdAt: string;
}

// ─── Billing Service Contract ─────────────────────────────────────────────────

export interface IBillingService {
  /** Check if a tenant has a named feature entitlement */
  hasEntitlement(tenantId: TenantId, feature: FeatureEntitlement): Promise<boolean>;
  /** Get current quota usage for a resource */
  getQuotaUsage(tenantId: TenantId, resource: QuotaResource): Promise<QuotaStatus>;
  /** Increment a usage counter — idempotent */
  trackUsage(tenantId: TenantId, resource: QuotaResource, delta: number): Promise<void>;
  /** List invoices for a tenant */
  listInvoices(tenantId: TenantId): Promise<Invoice[]>;
}

export type FeatureEntitlement =
  | "ADVANCED_AI"
  | "SEMANTIC_SEARCH"
  | "ANALYTICS_PRO"
  | "CUSTOM_DOMAIN"
  | "REALTIME_FEEDS"
  | "WHITE_LABEL";

export type QuotaResource = "ai_tokens" | "api_calls" | "listings" | "team_members" | "storage_gb";

export interface QuotaStatus {
  resource: QuotaResource;
  limit: number;
  used: number;
  resetAt: string;
  isExceeded: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  pdfUrl: string | null;
  createdAt: string;
}

// ─── AI Service Contract ──────────────────────────────────────────────────────

export interface IAIService {
  /** Generate a text completion — provider-agnostic */
  complete(opts: AICompletionOpts): Promise<AICompletionResult>;
  /** Generate embeddings for a text input */
  embed(text: string, tenantId: TenantId): Promise<number[]>;
  /** Trigger async re-embedding for a listing */
  scheduleEmbedding(listingId: ListingId, tenantId: TenantId): Promise<void>;
  /** Get current AI configuration */
  getConfig(): Promise<AIConfiguration>;
  /** Update AI routing configuration (Super Admin only) */
  updateConfig(config: Partial<AIConfiguration>, actorId: AdminId): Promise<void>;
}

export interface AICompletionOpts {
  systemPrompt: string;
  userPrompt: string;
  tenantId: TenantId;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  content: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface AIConfiguration {
  activeModelName: string;
  fallbackModelName: string;
  semanticWeight: number;
  keywordWeight: number;
  bm25Weight: number;
  updatedAt: string;
}

// ─── Moderation Service Contract ──────────────────────────────────────────────

export interface IModerationService {
  /** Submit a listing or user for moderation review */
  submitForReview(opts: ModerationSubmission): Promise<void>;
  /** Get the moderation queue for Super Admin */
  getQueue(filter?: ModerationFilter): Promise<PaginatedResult<ModerationQueueItem>>;
  /** Record an admin action on a queue item */
  recordAction(itemId: string, action: ModerationActionType, actorId: AdminId, justification: string): Promise<void>;
  /** Get the fraud score for a specific user */
  getFraudScore(userId: UserId, tenantId: TenantId): Promise<number>;
}

export interface ModerationSubmission {
  tenantId: TenantId;
  targetType: "listing" | "user";
  targetId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  details: Record<string, unknown>;
}

export interface ModerationFilter {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface ModerationQueueItem {
  id: string;
  tenantId: TenantId;
  targetType: "listing" | "user";
  targetId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  riskScore: number;
  createdAt: string;
}

export type ModerationActionType = "ban" | "suspend" | "warning" | "clear" | "escalate";

// ─── Analytics Service Contract ───────────────────────────────────────────────

export interface IAnalyticsService {
  /** Get the latest platform-wide analytics snapshot */
  getPlatformSnapshot(): Promise<PlatformSnapshot>;
  /** Get per-tenant analytics summary */
  getTenantAnalytics(tenantId: TenantId): Promise<TenantAnalytics>;
  /** Track a platform-level event */
  trackEvent(event: PlatformEvent): Promise<void>;
}

export interface PlatformSnapshot {
  totalMrr: number;
  totalTenants: number;
  activeTenants: number;
  openTickets: number;
  moderationQueueDepth: number;
  snapshotDate: string;
}

export interface TenantAnalytics {
  tenantId: TenantId;
  listingViews30d: number;
  searchQueries30d: number;
  conversionRate: number;
  aiTokensConsumed30d: number;
}

export interface PlatformEvent {
  name: string;
  tenantId?: TenantId;
  userId?: UserId;
  properties?: Record<string, unknown>;
}

// ─── Event Bus Types ──────────────────────────────────────────────────────────

export type PlatformEventType =
  | "tenant.created"
  | "tenant.suspended"
  | "listing.created"
  | "listing.updated"
  | "listing.embedding.scheduled"
  | "moderation.flagged"
  | "billing.quota.exceeded"
  | "ai.inference.completed";

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: PlatformEventType;
  tenantId?: TenantId;
  payload: T;
  occurredAt: string;
}

// ─── Shared Utility Types ─────────────────────────────────────────────────────

export interface PaginationOpts {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
