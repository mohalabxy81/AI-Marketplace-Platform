"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal, Edit, Eye, Trash2 } from "lucide-react";
import { DbListing } from "@/types/database";
import { useVirtualizer } from "@tanstack/react-virtual";
import { StatusBadge } from "./status-badge";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ListingsTableProps {
  data: DbListing[];
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: DbListing["status"]) => void;
}

export function ListingsTable({
  data,
  onDelete,
  onBulkDelete,
  onBulkStatusChange,
}: ListingsTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    onBulkDelete?.(Array.from(selectedIds));
    clearSelection();
  };

  const handleBulkStatusChange = (status: DbListing["status"]) => {
    onBulkStatusChange?.(Array.from(selectedIds), status);
    clearSelection();
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate row height
    overscan: 5,
  });

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-text-muted)]">No listings found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onDelete={onBulkDelete ? handleBulkDelete : undefined}
          onPublish={
            onBulkStatusChange
              ? () => handleBulkStatusChange("published")
              : undefined
          }
          onArchive={
            onBulkStatusChange
              ? () => handleBulkStatusChange("archived")
              : undefined
          }
        />
      )}

      <div className="w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div 
          ref={parentRef}
          className="overflow-auto max-h-[600px] relative w-full"
        >
          <table className="w-full text-left text-sm text-[var(--color-text)]">
            <thead className="bg-[var(--color-surface-alt)] text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] border-b border-[var(--color-border)] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)] cursor-pointer"
                    aria-label="Select all listings"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Listing</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Price</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody 
              className="divide-y divide-[var(--color-border)] relative"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const listing = data[virtualRow.index];
                return (
                <tr
                  key={listing.id}
                  className={`hover:bg-[var(--color-surface-alt)]/50 transition-colors absolute top-0 left-0 w-full flex sm:table-row ${
                    selectedIds.has(listing.id)
                      ? "bg-[var(--color-accent)]/5"
                      : ""
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <td className="px-4 py-3 w-10 sm:w-auto">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(listing.id)}
                      onChange={() => toggleOne(listing.id)}
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)] cursor-pointer"
                      aria-label={`Select ${listing.title}`}
                    />
                  </td>
                  <td className="px-4 py-3 flex-1 sm:flex-auto">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-border)]">
                        {listing.images && listing.images[0] ? (
                          <Image
                            src={listing.images[0]}
                            alt={listing.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-alt)]">
                            <span className="text-[10px] text-[var(--color-text-subtle)]">
                              No img
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[var(--color-text)] truncate max-w-[200px]">
                          {listing.title}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">
                          {listing.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-24 sm:w-auto">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize w-32">
                    {listing.type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs w-24">
                    ${listing.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right w-16 sm:w-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/listings/${listing.id}`}
                            className="cursor-pointer flex items-center"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/listings/${listing.id}/edit`}
                            className="cursor-pointer flex items-center"
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-950/50"
                              onClick={() => onDelete(listing.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
