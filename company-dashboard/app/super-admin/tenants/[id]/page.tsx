// app/(super-admin)/tenants/[id]/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "@/features/platform-core/hooks/use-admin-auth";
import { useSubscriptionsQuery } from "@/features/billing/hooks/use-billing-queries";
import { useImpersonateUserMutation } from "@/features/support/hooks/use-support-tickets";
import { MOCK_TENANTS } from "@/lib/mock/super-admin-mock-data";
import { ArrowLeft, Key, ShieldCheck, AlertTriangle } from "lucide-react";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const { hasCapability } = useAdminAuth();
  
  const tenant = MOCK_TENANTS.find((t) => t.id === tenantId);
  const impersonateMutation = useImpersonateUserMutation();

  const [activeTab, setActiveTab] = React.useState<"overview" | "billing" | "moderation" | "support" | "audit">("overview");

  if (!hasCapability("view_analytics_snapshots")) {
    return <div className="text-red-500 font-bold p-8">ACCESS_DENIED</div>;
  }

  if (!tenant) {
    return <div className="text-zinc-500 p-8">TENANT_NOT_FOUND</div>;
  }

  const handleImpersonate = () => {
    if (!hasCapability("impersonate_user")) return;
    const justification = window.prompt("Enter justification for impersonation:");
    if (justification) {
      impersonateMutation.mutate({
        adminId: "admin-1", // Should come from session
        userId: tenant.owner_email,
        companyId: tenant.id,
        justification
      });
    }
  };

  const tabs = [
    { id: "overview", label: "OVERVIEW" },
    { id: "billing", label: "BILLING & QUOTA" },
    { id: "moderation", label: "MODERATION" },
    { id: "support", label: "SUPPORT TICKETS" },
    { id: "audit", label: "AUDIT LOGS" }
  ];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        <button 
          onClick={() => router.push("/super-admin/tenants")}
          className="flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-bold">BACK_TO_REGISTRY</span>
        </button>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-amber-500 uppercase">{tenant.name}</h1>
            <p className="text-zinc-500 mt-1">ID: {tenant.id}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleImpersonate}
              disabled={impersonateMutation.isPending}
              className="flex items-center space-x-2 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
            >
              <Key className="h-4 w-4" />
              <span>IMPERSONATE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-500 bg-amber-500/5"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Placeholder */}
      <div className="border border-zinc-800 bg-zinc-950 p-6 min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-400">ORGANIZATION DETAILS</h3>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">OWNER NAME</div>
                <div className="text-zinc-200">{tenant.owner_name}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">OWNER EMAIL</div>
                <div className="text-zinc-200">{tenant.owner_email}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">STATUS</div>
                <div className="text-emerald-500 font-bold uppercase">{tenant.status}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 mb-1">CREATED AT</div>
                <div className="text-zinc-200">{new Date(tenant.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "billing" && (
          <div className="text-zinc-500">Billing & Quota management view loaded...</div>
        )}

        {activeTab === "moderation" && (
          <div className="text-zinc-500">Moderation history view loaded...</div>
        )}

        {activeTab === "support" && (
          <div className="text-zinc-500">Support tickets view loaded...</div>
        )}

        {activeTab === "audit" && (
          <div className="text-zinc-500">Tenant-specific audit trail loaded...</div>
        )}
      </div>
    </div>
  );
}
