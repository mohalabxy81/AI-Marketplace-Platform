"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, LayoutGrid, List } from "lucide-react";
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
import { ListingCard } from "@/features/listings";
import { ListingsFilters } from "@/features/listings";
// import type { DbListing } from "@/types/database";

type ViewMode = "table" | "grid";

export default function ListingsPage() {
  const { data: listings, isLoading } = useListings();
  const { mutate: deleteListing } = useDeleteListing();
  const { can } = usePermissions();

  const canManage = can("manage_listings");

  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  const filteredListings = React.useMemo(() => {
    if (!listings) return [];
    return listings.filter((listing) => {
      const matchesSearch =
        !searchQuery ||
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || listing.status === statusFilter;
      const matchesType = !typeFilter || listing.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [listings, searchQuery, statusFilter, typeFilter]);

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Listings</PageTitle>
          <PageDescription>
            Manage your company&apos;s products, services, and properties.
          </PageDescription>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href="/listings/create">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                New Listing
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      <PageContent className="space-y-6">
        {/* Filters + View Toggle Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <ListingsFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
          />

          {/* Table / Grid Toggle */}
          <div className="flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={`flex items-center gap-1.5 rounded-[calc(var(--radius-xs)-2px)] px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`flex items-center gap-1.5 rounded-[calc(var(--radius-xs)-2px)] px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Showing{" "}
            <span className="font-medium text-[var(--color-text)]">
              {filteredListings.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--color-text)]">
              {listings?.length ?? 0}
            </span>{" "}
            listings
          </p>
        )}

        {/* Main Content */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center animate-pulse bg-[var(--color-surface)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
            <span className="text-[var(--color-text-muted)] text-sm">
              Loading...
            </span>
          </div>
        ) : viewMode === "table" ? (
          <ListingsTable
            data={filteredListings}
            onDelete={canManage ? (id) => deleteListing(id) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredListings.length === 0 ? (
              <div className="col-span-full flex h-48 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No listings found.
                </p>
              </div>
            ) : (
              filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onDelete={
                    canManage ? (id) => deleteListing(id) : undefined
                  }
                />
              ))
            )}
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
