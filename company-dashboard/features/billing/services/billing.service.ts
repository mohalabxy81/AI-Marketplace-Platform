// features/billing/services/billing.service.ts
import { supabase } from "@/lib/supabase/client";
import { type TenantSubscription, type TenantInvoice } from "@/types/super-admin/billing";

export interface SubscriptionFilters {
  companyId?: string;
  planId?: string;
  status?: string;
}

export interface InvoiceFilters {
  companyId?: string;
  status?: string;
}

export const billingService = {
  /**
   * Fetch paginated tenant subscriptions with optional filters.
   */
  async getSubscriptions(filters?: SubscriptionFilters): Promise<TenantSubscription[]> {
    let query = supabase
      .from("tenant_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.companyId) query = query.eq("company_id", filters.companyId);
    if (filters?.planId) query = query.eq("plan_id", filters.planId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`billingService.getSubscriptions: ${error.message}`);
    return (data as TenantSubscription[]) ?? [];
  },

  /**
   * Fetch invoices with optional company or status filter.
   */
  async getInvoices(filters?: InvoiceFilters): Promise<TenantInvoice[]> {
    let query = supabase
      .from("tenant_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.companyId) query = query.eq("company_id", filters.companyId);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw new Error(`billingService.getInvoices: ${error.message}`);
    return (data as TenantInvoice[]) ?? [];
  },

  /**
   * Issue a refund for a paid invoice. Writes a billing event record.
   * NOTE: Actual Stripe API call is handled server-side via API route.
   */
  async issueRefund(invoiceId: string, companyId: string, amount: number): Promise<void> {
    const { error } = await supabase.from("billing_events").insert({
      company_id: companyId,
      event_type: "manual.refund.initiated",
      payload: { invoice_id: invoiceId, amount_cents: amount },
    });

    if (error) throw new Error(`billingService.issueRefund: ${error.message}`);
  },

  /**
   * Override a quota limit for a specific company resource.
   */
  async overrideQuota(
    companyId: string,
    resourceName: string,
    newLimit: number
  ): Promise<void> {
    const { error } = await supabase
      .from("quota_usage")
      .upsert(
        { company_id: companyId, resource_name: resourceName, limit_amount: newLimit },
        { onConflict: "company_id, resource_name" }
      );

    if (error) throw new Error(`billingService.overrideQuota: ${error.message}`);
  },
};
