"use client";

import { Badge } from "@/components/ui/badge";
import { ListingStatus } from "@/types/database";

const statusConfig: Record<ListingStatus, { label: string; variant: "default" | "success" | "muted" | "warning" | "error" }> = {
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "muted" },
  pending_review: { label: "Pending", variant: "warning" },
  archived: { label: "Archived", variant: "error" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}
