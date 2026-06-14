"use client";

import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListingsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

export function ListingsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: ListingsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search listings..."
          className="h-9 w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
        />
      </div>

      {/* Dropdowns */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
        <select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className="h-9 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="real_estate">Real Estate</option>
          <option value="products">Products</option>
          <option value="services">Services</option>
          <option value="cars">Cars</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-9 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="archived">Archived</option>
        </select>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
        >
          More Filters
        </Button>
      </div>
    </div>
  );
}
