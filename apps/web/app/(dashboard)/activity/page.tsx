"use client";

import { ActivityFeed } from "@/features/activity";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";

export default function ActivityPage() {
  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>System Audit Log</PageTitle>
          <PageDescription>
            Real-time chronological log of actions and configuration changes performed across your company workspace.
          </PageDescription>
        </div>
      </PageHeader>

      <PageContent>
        <div className="max-w-3xl">
          <ActivityFeed />
        </div>
      </PageContent>
    </PageContainer>
  );
}
