"use client";

import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal, Edit, Eye, Trash2 } from "lucide-react";
import { DbListing } from "@/types/database";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface ListingCardProps {
  listing: DbListing;
  onDelete?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export function ListingCard({ listing, onDelete, selected, onSelect }: ListingCardProps) {
  return (
    <Card className={`overflow-hidden transition-all duration-200 ${selected ? 'ring-2 ring-[var(--color-accent)]' : 'hover:border-[var(--color-border-hover)]'}`}>
      <div className="relative aspect-video w-full bg-[var(--color-surface-alt)]">
        {onSelect && (
          <div className="absolute top-2 left-2 z-10">
            <input 
              type="checkbox" 
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
              checked={selected}
              onChange={(e) => onSelect(listing.id, e.target.checked)}
            />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <StatusBadge status={listing.status} />
        </div>
        {listing.images && listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] text-[var(--color-text-subtle)]">No image</span>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col min-w-0">
            <h3 className="font-semibold text-[var(--color-text)] truncate">{listing.title}</h3>
            <span className="text-xs text-[var(--color-text-muted)] truncate">{listing.category}</span>
          </div>
          <span className="font-mono text-sm font-medium shrink-0">
            ${listing.price.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center text-xs text-[var(--color-text-subtle)] capitalize">
          {listing.type.replace("_", " ")} {listing.location && `• ${listing.location}`}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center border-t border-[var(--color-border)] mt-auto bg-[var(--color-surface-alt)]/30">
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(listing.created_at).toLocaleDateString()}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4 text-[var(--color-text-muted)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/listings/${listing.id}`} className="cursor-pointer flex items-center">
                <Eye className="mr-2 h-4 w-4" /> View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/listings/${listing.id}/edit`} className="cursor-pointer flex items-center">
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
      </CardFooter>
    </Card>
  );
}
