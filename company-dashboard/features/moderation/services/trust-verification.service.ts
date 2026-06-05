import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { randomUUID } from "crypto";
import { VerificationStatus } from "@";

export class TrustVerificationService {
  /**
   * Request a new verification for a tenant
   */
  public async requestVerification(tenantId: string, type: "kyb" | "domain" | "tax_id", documentUrl?: string): Promise<void> {
    const supabase = this.getClient();

    const { error } = await supabase.from("trust_verifications").insert({
      id: randomUUID(),
      company_id: tenantId,
      status: "PENDING",
      verification_type: type,
      document_url: documentUrl || null,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error(`[TrustVerification] Failed to request verification for ${tenantId}`, error);
      throw new Error("Failed to request verification");
    }
    
    // In a real system, this might dispatch an event to trigger a manual review or a third-party KYC/KYB service
  }

  /**
   * Approve or reject a verification request
   */
  public async processVerification(verificationId: string, status: "VERIFIED" | "REJECTED", adminId: string): Promise<void> {
    const supabase = this.getClient();

    // 1. Update verification record
    const { data: verification, error: updateError } = await supabase
      .from("trust_verifications")
      .update({
        status,
        verified_at: new Date().toISOString(),
        verified_by: adminId
      })
      .eq("id", verificationId)
      .select()
      .single();

    if (updateError || !verification) {
      console.error(`[TrustVerification] Failed to process verification ${verificationId}`, updateError);
      throw new Error("Failed to process verification");
    }

    // 2. If verified, emit event
    if (status === "VERIFIED") {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "trust.verified",
        schemaVersion: 1,
        producerDomain: "moderation",
        tenantId: verification.company_id,
        actorId: adminId,
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: {
          companyId: verification.company_id,
          verificationType: verification.verification_type,
          status
        },
        metadata: { source: "system", environment: "production" }
      });
    }
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

export const trustVerificationService = new TrustVerificationService();
