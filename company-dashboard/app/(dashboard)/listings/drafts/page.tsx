"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useListings, useDeleteListing } from "@/hooks/use-listings";
import { usePermissions } from "@/hooks/use-permissions";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { ListingsTable } from "@/features/listings";

export default function DraftListingsPage() {
  const { data: allListings, isLoading } = useListings();
  const { mutate: deleteListing } = useDeleteListing();
  const { can } = usePermissions();

  const canManage = can("manage_listings");

  const draftListings = allListings?.filter((l) => l.status === "draft") ?? [];
  const pendingListings =
    allListings?.filter((l) => l.status === "pending_review") ?? [];

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Drafts & Pending</PageTitle>
          <PageDescription>
            Listings that are not yet published. Review and publish when ready.
          </PageDescription>
        </div>
        {canManage && (
          <Link href="/listings/create">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Listing</Button>
          </Link>
        )}
      </PageHeader>

      <PageContent className="space-y-10">
        {/* Draft Listings */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Drafts
            </h2>
            <span className="rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {draftListings.length}
            </span>
          </div>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
          ) : (
            <ListingsTable
              data={draftListings}
              onDelete={canManage ? (id) => deleteListing(id) : undefined}
            />
          )}
        </section>

        {/* Pending Review Listings */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Pending Review
            </h2>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-400">
              {pendingListings.length}
            </span>
          </div>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
          ) : (
            <ListingsTable
              data={pendingListings}
              onDelete={canManage ? (id) => deleteListing(id) : undefined}
            />
          )}
        </section>
      </PageContent>
    </PageContainer>
  );
}
