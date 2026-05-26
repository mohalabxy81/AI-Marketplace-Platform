"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function CompanySwitcher() {
  const { company } = useAuth();

  // In a real multi-tenant app with user belonging to multiple companies,
  // we would fetch the list of companies the user has access to.
  // For now, this is a placeholder demonstrating the UI pattern.
  const activeCompany = company || { name: "Personal Workspace", id: "personal" };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-[200px] justify-between px-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
        >
          <div className="flex items-center gap-2 truncate">
            <Avatar name={activeCompany.name} size="xs" className="h-5 w-5 rounded-[var(--radius-xs)]" />
            <span className="truncate text-sm font-medium">
              {activeCompany.name}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start">
        <DropdownMenuLabel className="text-xs">Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-2">
            <Avatar name={activeCompany.name} size="xs" className="h-5 w-5 rounded-[var(--radius-xs)]" />
            <span className="truncate">{activeCompany.name}</span>
          </div>
          <Check className="h-4 w-4 opacity-100" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-[var(--color-text-muted)]">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
