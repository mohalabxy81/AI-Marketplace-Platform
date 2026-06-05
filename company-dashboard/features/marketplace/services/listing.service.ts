import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";
import { DbListing, InsertListing, ListingStatus } from "@/types/database";
import { eventBus } from "@/features/platform-core";
import { auditService } from "@/features/platform-core";
import { randomUUID } from "crypto";

export class ListingService {
  /**
   * Creates a new listing in 'draft' status and emits creation event.
   */
  public async createListing(context: TenantContext, payload: InsertListing): Promise<DbListing> {
    const supabase = this.getClient();
    
    // Enforce TenantContext boundary
    const safePayload = {
      ...payload,
      company_id: context.tenantId,
      created_by: context.userId,
      status: "draft" as ListingStatus
    };

    const { data: newListing, error } = await supabase
      .from("listings")
      .insert([safePayload])
      .select()
      .single();

    if (error || !newListing) {
      throw new Error(`[ListingService] Failed to create listing: ${error?.message}`);
    }

    // Emit asynchronous Domain Event
    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "listing.created",
      schemaVersion: 1,
      producerDomain: "marketplace",
      tenantId: context.tenantId,
      actorId: context.userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        listingId: newListing.id,
        type: newListing.type,
        category: newListing.category,
        title: newListing.title
      },
      metadata: { source: "api", environment: "production" }
    });

    return newListing as DbListing;
  }

  /**
   * State machine transition to publish a listing.
   * Enforces business rules and triggers cross-domain workflows.
   */
  public async publishListing(context: TenantContext, listingId: string): Promise<void> {
    const supabase = this.getClient();

    // 1. Fetch current state
    const { data: listing } = await supabase
      .from("listings")
      .select("status")
      .eq("id", listingId)
      .eq("company_id", context.tenantId)
      .single();

    if (!listing) throw new Error("Listing not found or access denied.");
    if (listing.status === "published") return;

    // 2. TODO: Phase 4.4 Billing Quota Enforcement Integration
    // const { allowed } = quotaEnforcer.check(context, "listings");
    // if (!allowed) throw new Error("Listing quota exceeded");

    // 3. TODO: Phase 4.5 Trust & Safety Moderation Pre-screen Integration
    // const riskScore = await moderationService.evaluate(listingId);
    // const newStatus = riskScore > 70 ? "pending_review" : "published";

    const newStatus: ListingStatus = "published";

    // 4. Update Database
    const { error } = await supabase
      .from("listings")
      .update({ status: newStatus })
      .eq("id", listingId);

    if (error) throw new Error("Failed to publish listing");

    // 5. Emit Events & Audit
    await auditService.record({
      actor_id: context.userId,
      company_id: context.tenantId,
      action: "listing.publish",
      resource_type: "listing",
      resource_id: listingId,
      old_state: { status: listing.status },
      new_state: { status: newStatus }
    });

    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "listing.status_changed",
      schemaVersion: 1,
      producerDomain: "marketplace",
      tenantId: context.tenantId,
      actorId: context.userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        listingId,
        oldStatus: listing.status,
        newStatus
      },
      metadata: { source: "api", environment: "production" }
    });
  }

  private getClient() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
}

export const listingService = new ListingService();
