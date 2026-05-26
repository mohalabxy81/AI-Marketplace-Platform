"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/services/auth/auth.service";
import { useRouter } from "next/navigation";
import { CompanySwitcher } from "./company-switcher";
import { CommandSearch } from "./command-search";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";

export function TopHeader() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const { user } = useAuth();
  const router = useRouter();

  // Simple breadcrumb logic from pathname
  const segments = pathname.split("/").filter(Boolean);
  const currentPath = segments[0]
    ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
    : "Dashboard";

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-[var(--header-height)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-xs)] md:hidden hover:bg-[var(--color-surface-alt)]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Company Switcher / Breadcrumbs */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <CompanySwitcher />
          </div>
          <span className="hidden md:block text-[var(--color-border)] mx-1">/</span>
          <h1 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
            {currentPath}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search */}
        <CommandSearch />

        {/* Notifications */}
        <NotificationDropdown />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar name={user?.full_name || user?.email} size="sm" className="cursor-pointer" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Account Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400 focus:bg-red-950/50"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
