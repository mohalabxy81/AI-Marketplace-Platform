"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Clock,
  Sparkles,
  TrendingUp,
  Tag,
} from "lucide-react";
import { useListing } from "@/hooks/use-listings";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/listings";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder activity items — will be replaced by real data from audit log table
const MOCK_ACTIVITY = [
  { id: 1, action: "Listing created", actor: "You", time: "2 days ago" },
  {
    id: 2,
    action: "Status changed to Pending Review",
    actor: "You",
    time: "1 day ago",
  },
  {
    id: 3,
    action: "Published by Manager",
    actor: "Admin",
    time: "6 hours ago",
  },
];

export default function ListingPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: listing, isLoading, error } = useListing(id);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-[var(--color-error)]">
          Failed to load listing details.
        </p>
      </div>
    );
  }

  if (isLoading || !listing) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <span className="text-[var(--color-text-muted)] animate-pulse">
          Loading preview...
        </span>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader className="mb-6">
        <div className="flex flex-col gap-2">
          <Link href="/listings">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 text-[var(--color-text-muted)]"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to listings
            </Button>
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <PageTitle>{listing.title}</PageTitle>
            <StatusBadge status={listing.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<ExternalLink className="h-4 w-4" />}
          >
            View Live
          </Button>
          <Link href={`/listings/${listing.id}/edit`}>
            <Button leftIcon={<Edit className="h-4 w-4" />}>
              Edit Listing
            </Button>
          </Link>
        </div>
      </PageHeader>

      <PageContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="grid grid-cols-2 gap-4">
            {listing.images?.length > 0 ? (
              listing.images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-video bg-[var(--color-surface-alt)] rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden"
                >
                  <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-2 aspect-video bg-[var(--color-surface-alt)] rounded-[var(--radius-sm)] border border-[var(--color-border)] flex items-center justify-center">
                <span className="text-[var(--color-text-muted)] text-sm">
                  No images uploaded
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap leading-relaxed">
                {listing.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
                <h3 className="text-sm font-semibold">Activity History</h3>
              </div>
              <ol className="relative border-l border-[var(--color-border)] space-y-4 ml-2">
                {MOCK_ACTIVITY.map((item) => (
                  <li key={item.id} className="ml-4">
                    <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--color-accent)]" />
                    <p className="text-sm text-[var(--color-text)]">
                      {item.action}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {item.actor} · {item.time}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-[var(--color-text-subtle)] italic">
                Full audit log will be loaded from the database activity_logs
                table.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">Metadata</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">Price</dt>
                  <dd className="font-mono">${listing.price.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">Category</dt>
                  <dd>{listing.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">Type</dt>
                  <dd className="capitalize">
                    {listing.type.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">Location</dt>
                  <dd>{listing.location || "N/A"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <h3 className="text-sm font-semibold">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights Placeholder */}
          <Card className="border border-dashed border-[var(--color-accent)]/40">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  AI Insights
                </h3>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Once the AI engine is connected, you&apos;ll see performance
                predictions, suggested improvements, and competitive pricing
                analysis here.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-3 opacity-50">
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Predicted engagement score: —
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-3 opacity-50">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)] shrink-0" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    SEO quality: —
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Placeholder */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
              <h3 className="text-sm font-semibold">Analytics</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Analytics engine is not yet connected. Interactions will appear
                here.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
