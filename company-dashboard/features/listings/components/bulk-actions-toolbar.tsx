"use client";

import * as React from "react";
import { Trash2, Archive, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onPublish?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onDelete,
  onArchive,
  onPublish
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="flex items-center gap-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 shadow-lg dark:shadow-none ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-r border-[var(--color-border)] pr-4">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-[var(--color-text)]">
            selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPublish && (
            <Button variant="ghost" size="sm" onClick={onPublish} leftIcon={<CheckCircle className="h-4 w-4" />}>
              Publish
            </Button>
          )}
          {onArchive && (
            <Button variant="ghost" size="sm" onClick={onArchive} leftIcon={<Archive className="h-4 w-4" />}>
              Archive
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
          )}
        </div>

        <div className="border-l border-[var(--color-border)] pl-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
