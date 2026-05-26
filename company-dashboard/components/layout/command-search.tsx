"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Modal, ModalContent } from "@/components/ui/modal";

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);

  // Toggle command modal with Ctrl+K / Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 w-64 h-9 px-3 rounded-[var(--radius-xs)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)] transition-colors group"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm font-medium">Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-1.5 font-mono text-[10px] font-medium text-[var(--color-text-muted)] opacity-100 group-hover:text-[var(--color-text)]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className="p-0 overflow-hidden max-w-2xl border-[var(--color-border)] shadow-2xl bg-[var(--color-bg)]">
          <div className="flex items-center border-b border-[var(--color-border)] px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            <input
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--color-text-muted)] text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type a command or search..."
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-[var(--color-text)]">
            <div className="px-2 py-4 text-center text-sm text-[var(--color-text-muted)]">
              No results found. Start typing to search across your workspace.
            </div>
            {/* Future implementation: List command groups and items here */}
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
