/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import {
  CreditCard,
  Zap,
  Check,
  TrendingUp,
  History,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ── Mock Data ──────────────────────────────────────────────────

const CURRENT_PLAN = {
  name: "Scale Operator",
  price: "$299/mo",
  billingCycle: "Monthly",
  nextBillingDate: "June 28, 2026",
  status: "active",
};

const USAGE_METRIC = {
  tokenUsage: {
    used: 728492,
    limit: 1000000,
    unit: "Tokens",
    percentage: 72.8,
  },
  apiCalls: {
    used: 42180,
    limit: 50000,
    unit: "Requests",
    percentage: 84.3,
  },
  agentSessions: {
    used: 184,
    limit: 200,
    unit: "Sessions",
    percentage: 92.0,
  },
};

const INVOICES = [
  { id: "INV-2026-003", date: "May 28, 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2026-002", date: "Apr 28, 2026", amount: "$299.00", status: "Paid" },
  { id: "INV-2026-001", date: "Mar 28, 2026", amount: "$299.00", status: "Paid" },
];

const AVAILABLE_PLANS = [
  {
    id: "standard",
    name: "Base Node",
    price: "$99",
    period: "mo",
    description: "For startups launching agentic discovery systems.",
    features: [
      "250k Monthly Tokens",
      "10k API Requests",
      "5 Active Agents",
      "Standard Latency SLA",
      "8/5 Support Core",
    ],
    isCurrent: false,
  },
  {
    id: "scale",
    name: "Scale Operator",
    price: "$299",
    period: "mo",
    description: "For high-performance multi-tenant operating needs.",
    features: [
      "1.0M Monthly Tokens",
      "50k API Requests",
      "20 Active Agents",
      "Low Latency Priority Queue",
      "24/7 Priority Support",
      "Custom UI Styling Injection",
    ],
    isCurrent: true,
  },
  {
    id: "enterprise",
    name: "Kernel Dedicated",
    price: "Custom",
    period: "",
    description: "For dedicated compute clusters and infinite scale.",
    features: [
      "Unlimited Tokens (Billed on usage)",
      "Dedicated Gateway Endpoints",
      "Infinite Agent Workflows",
      "0ms-cold-start guarantee",
      "Direct Slack to Core Engineers",
      "Tailored Compliance & Auditing",
    ],
    isCurrent: false,
  },
];

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("scale");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (planId === "scale") return; // Already on this plan
    setIsUpgrading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsUpgrading(false);
  };

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Billing & Monetization</PageTitle>
          <PageDescription>
            Manage subscription plans, check agentic token consumption, and view invoices.
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent className="space-y-6">
        {/* Top summary layout - Asymmetric Tension */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Plan details */}
          <Card className="lg:col-span-1 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--color-accent)] font-semibold text-xs uppercase tracking-wider mb-2">
                <Layers className="h-3.5 w-3.5" />
                Current Active Subscription
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text)] mt-1">{CURRENT_PLAN.name}</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Your workspace is on a {CURRENT_PLAN.billingCycle.toLowerCase()} billing cycle.
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[var(--color-text)]">{CURRENT_PLAN.price}</span>
                <span className="text-xs text-[var(--color-text-muted)]">/ month</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Next invoice: {CURRENT_PLAN.nextBillingDate}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                Active
              </span>
            </div>
          </Card>

          {/* Consumption tracking metrics */}
          <Card className="lg:col-span-2 border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[var(--color-text)] font-semibold text-xs uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                Resource Consumption Meter
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Real-time usage tracking
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(USAGE_METRIC).map(([key, metric]) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-[var(--color-text)] capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      <strong className="text-[var(--color-text)]">{metric.used.toLocaleString()}</strong> /{" "}
                      {metric.limit.toLocaleString()} {metric.unit}
                    </span>
                  </div>
                  {/* Custom thin bar meter */}
                  <div className="h-2 w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-none overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        metric.percentage > 90
                          ? "bg-[var(--color-error)]"
                          : metric.percentage > 75
                          ? "bg-[var(--color-warning)]"
                          : "bg-[var(--color-accent)]"
                      }`}
                      style={{ width: `${metric.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Plan Matrix selection */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
            Available Operating Kernel Plans
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AVAILABLE_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between relative border ${
                  plan.isCurrent
                    ? "border-[var(--color-accent)]/50 bg-[var(--color-accent-dim)]/20"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-subtle)]"
                } transition-all`}
              >
                {plan.isCurrent && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-black font-extrabold text-[9px] uppercase tracking-widest">
                    Your Cluster
                  </span>
                )}
                <div>
                  <h4 className="text-base font-bold text-[var(--color-text)]">{plan.name}</h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 min-h-[32px]">
                    {plan.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-[var(--color-text)]">{plan.price}</span>
                    {plan.period && (
                      <span className="text-xs text-[var(--color-text-muted)]">/{plan.period}</span>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2 border-t border-[var(--color-border)]/50 pt-4">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                        <Check className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {plan.isCurrent ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.id === "enterprise" ? "outline" : "primary"}
                      size="sm"
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                      isLoading={isUpgrading && selectedPlan === plan.id}
                    >
                      {plan.id === "enterprise" ? "Contact Architecture Team" : `Deploy ${plan.name}`}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing Invoice Ledger Table */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 mb-4">
            <History className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
              Monetization Ledger & Invoice History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th className="py-2 font-medium uppercase tracking-wider">Invoice ID</th>
                  <th className="py-2 font-medium uppercase tracking-wider">Billing Date</th>
                  <th className="py-2 font-medium uppercase tracking-wider">Amount</th>
                  <th className="py-2 font-medium uppercase tracking-wider">Status</th>
                  <th className="py-2 pr-2 text-right uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[var(--color-border)]/50 last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors"
                  >
                    <td className="py-3 font-semibold text-[var(--color-text)]">{inv.id}</td>
                    <td className="py-3 text-[var(--color-text-muted)]">{inv.date}</td>
                    <td className="py-3 text-[var(--color-text)] font-mono">{inv.amount}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button className="text-[var(--color-accent)] hover:text-white transition-colors p-1" title="Download PDF">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Billing Policy Callout */}
        <div className="flex gap-3 items-start border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 rounded-none">
          <AlertCircle className="h-5 w-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[var(--color-text)]">About Ledger-Based Metering</h4>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
              Token usage and API request limits are synced directly with the Supabase SSR context and monitored in real time.
              Exceeding plan limits will trigger automated token metering limits. Overages are billed at $0.00015 per additional request.
            </p>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
