"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Hexagon, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { sidebarConfig } from "@/features/navigation/nav-config";
import { SidebarNavItem } from "./sidebar-nav-item";
import { Avatar } from "@/components/ui/avatar";
import { getRoleLabel } from "@/lib/permissions";
import { signOut } from "@/services/auth/auth.service";

export function MobileSidebar() {
  const { isOpen, setOpen, isMobile } = useSidebar();
  const { user, company } = useAuth();
  const { role } = usePermissions();
  const router = useRouter();

  // Prevent hydration errors by only rendering on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || !isMobile) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      setOpen(false);
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-sidebar)] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content 
          aria-describedby="sidebar-description"
          className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-[280px] flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <div className="sr-only">
            <Dialog.Title>Navigation Menu</Dialog.Title>
            <Dialog.Description id="sidebar-description">
              Mobile navigation sidebar for the company dashboard.
            </Dialog.Description>
          </div>
          {/* Header */}
          <div className="flex h-[var(--header-height)] items-center justify-between px-4 border-b border-[var(--color-border)]">
            <Link href="/overview" onClick={() => setOpen(false)} className="flex items-center gap-3" aria-label="Go to Overview">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-black" aria-hidden="true">
                {company?.logo ? (
                  <Image src={company.logo} alt={company.name} width={32} height={32} className="h-full w-full object-cover rounded-[var(--radius-xs)]" />
                ) : (
                  <Hexagon className="h-5 w-5 fill-current" />
                )}
              </div>
              <span className="text-sm font-bold tracking-tight text-[var(--color-text)] truncate">
                {company?.name || "Workspace"}
              </span>
            </Link>
            <Dialog.Close 
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="flex flex-col gap-6 px-3">
              {sidebarConfig.sections.map((section) => (
                <div key={section.id} className="flex flex-col gap-1">
                  {section.label && (
                    <h4 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                      {section.label}
                    </h4>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <SidebarNavItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.full_name || user?.email} size="md" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {user?.full_name || user?.email}
                </span>
                <span className="text-xs text-[var(--color-accent)] font-medium">
                  {role ? getRoleLabel(role) : "User"}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/50 w-full transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
