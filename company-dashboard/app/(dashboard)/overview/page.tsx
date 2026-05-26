"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { SkeletonStatCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";

export default function OverviewPage() {
  const { user, company } = useAuth();

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Welcome back, {user?.full_name || "User"}</PageTitle>
          <PageDescription>
            Here is what is happening in {company?.name || "your workspace"} today.
          </PageDescription>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Activity className="h-4 w-4" />}>
            Download Report
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Listing
          </Button>
        </div>
      </PageHeader>

      <PageContent className="space-y-8">
        {/* Stat Cards Stub */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Recent Activity Stub */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Recent Activity
          </h3>
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Your team's recent actions and listing updates will appear here."
          />
        </div>
      </PageContent>
    </PageContainer>
  );
}
