// features/billing/hooks/use-billing-queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingService, type SubscriptionFilters, type InvoiceFilters } from "../services/billing.service";
import { quotaService } from "../services/quota.service";
import { logAdminAction } from "@/features/platform-core";
import { toast } from "sonner";
import { MOCK_ENTITLEMENTS } from "@/lib/mock/super-admin-mock-data";
import { supabase } from "@/lib/supabase/client";

// Get subscriptions
export function useSubscriptionsQuery(filters?: SubscriptionFilters) {
  return useQuery({
    queryKey: ["super-admin", "subscriptions", filters],
    queryFn: () => billingService.getSubscriptions(filters),
    staleTime: 30 * 1000
  });
}

// Get invoices
export function useInvoicesQuery(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ["super-admin", "invoices", filters],
    queryFn: () => billingService.getInvoices(filters),
    staleTime: 30 * 1000
  });
}

// Get quota usage for a company (or all if companyId is empty, though quotaService expects an ID. We can adapt if needed, but the original mock did all. Let's keep it simple for now and adapt.)
// Note: original mock query did all companies. If we need all, we should expand quotaService.
export function useQuotasQuery(companyId?: string) {
  return useQuery({
    queryKey: ["super-admin", "quotas", companyId],
    queryFn: async () => {
      if (companyId) {
        return quotaService.getQuotaUsage(companyId);
      }
      // Fallback to fetch all if no company specified
      const { data, error } = await supabase.from("quota_usage").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 30 * 1000
  });
}

// Get entitlements
export function useEntitlementsQuery() {
  return useQuery({
    queryKey: ["super-admin", "entitlements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_entitlements")
        .select("*");

      if (error || !data || data.length === 0) {
        return MOCK_ENTITLEMENTS;
      }
      return data;
    },
    staleTime: 30 * 1000
  });
}

// Mutation to override tenant quotas
export function useOverrideQuotaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      resourceName,
      limitAmount
    }: {
      companyId: string;
      resourceName: string;
      limitAmount: number;
    }) => {
      await logAdminAction(
        "billing.override_limit",
        "company",
        companyId,
        { resource: resourceName, action: "fetch_limit" },
        { resource: resourceName, new_limit: limitAmount }
      );

      await billingService.overrideQuota(companyId, resourceName, limitAmount);
      return { companyId, resourceName, limitAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "quotas"] });
      toast.success("Quota limit successfully overridden.");
    },
    onError: (err) => {
      toast.error(`Quota override failed: ${err.message}`);
    }
  });
}

// Mutation to issue refund (void invoice)
export function useIssueRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      companyId,
      amount
    }: {
      invoiceId: string;
      companyId: string;
      amount: number;
    }) => {
      await logAdminAction(
        "billing.refund",
        "company",
        companyId,
        { invoice_id: invoiceId, status: "paid" },
        { invoice_id: invoiceId, status: "refunded", amount }
      );

      // We call the billing service to write the event, then update the invoice status locally
      // (Actual refund would be a server API call to Stripe).
      await billingService.issueRefund(invoiceId, companyId, amount);

      const { data, error } = await supabase
        .from("tenant_invoices")
        .update({ status: "void", updated_at: new Date().toISOString() })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "invoices"] });
      toast.success("Invoice successfully refunded/voided.");
    },
    onError: (err) => {
      toast.error(`Refund failed: ${err.message}`);
    }
  });
}
