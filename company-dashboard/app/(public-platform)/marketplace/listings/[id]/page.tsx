import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Globe, MessageSquare, Shield, Check, MapPin, Sparkles, Building } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ id: string }>;
}

async function getListing(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get listing details and the associated company
  const { data: listing } = await supabase
    .from("listings")
    .select("*, company:companies(name, logo, website)")
    .eq("id", id)
    .single();

  return listing;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing) {
    return {
      title: "Listing Not Found",
    };
  }

  return {
    title: `${listing.title} — AI Marketplace`,
    description: listing.description || `Discover more about ${listing.title} on our AI Marketplace.`,
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6">
        <Link href="/marketplace" className="hover:text-[var(--color-text)] flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Marketplace
        </Link>
        <span>/</span>
        <Link href="/marketplace/search" className="hover:text-[var(--color-text)] transition-colors">
          Search
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)] truncate max-w-[200px]">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Gallery & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Visual/Hero */}
          <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] aspect-[16/9] relative">
            {listing.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-alt)]">
                <Sparkles className="h-16 w-16 text-[var(--color-text-subtle)] opacity-25" />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)] backdrop-blur-sm">
                {listing.category?.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Description Block */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <h2 className="text-lg font-bold text-[var(--color-text)]">About this service</h2>
            <div className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description provided for this listing."}
            </div>
          </div>

          {/* Attributes Grid */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Service Type", value: listing.type?.replace(/_/g, " ") || "Service" },
                { label: "Location", value: listing.location || "Remote" },
                { label: "Status", value: listing.status || "active" },
                { label: "Pricing Model", value: "Usage-based Subscription" },
              ].map((spec) => (
                <div key={spec.label} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-xs">
                  <span className="text-[var(--color-text-muted)]">{spec.label}</span>
                  <span className="font-semibold text-[var(--color-text)] capitalize">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Lead Capture */}
        <div className="space-y-6">
          {/* Purchase/Action Card */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Starting from</span>
              <span className="text-2xl font-black font-mono text-[var(--color-text)]">
                ${listing.price?.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
              <span className="text-[var(--color-text-muted)]">(5.0 / 5 stars)</span>
            </div>

            <hr className="border-[var(--color-border)]" />

            <div className="space-y-2 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                <span>Verified seller and secure integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                <span>99.9% uptime SLA included</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                <span>Custom API integration support</span>
              </div>
            </div>
          </div>

          {/* Seller / Company Info */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
              <Building className="h-4 w-4 text-[var(--color-accent)]" /> Service Provider
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]">
                <Building className="h-5 w-5 text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{listing.company?.name || "Independent Provider"}</p>
                {listing.location && (
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {listing.location}
                  </p>
                )}
              </div>
            </div>

            {listing.company?.website && (
              <a
                href={listing.company.website.startsWith("http") ? listing.company.website : `https://${listing.company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] p-2 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> Visit Website
              </a>
            )}
          </div>

          {/* Lead Capture Contact Form */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[var(--color-accent)]" /> Request Information
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Fill out the form below, and the service provider will contact you shortly with integration details.
            </p>
            <form className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold block mb-1">
                  Your Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold block mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="I'm interested in integrating this agent into our workflow..."
                  className="w-full rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled
                className="w-full rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Request
              </button>
            </form>
            <p className="text-[10px] text-[var(--color-text-subtle)] text-center flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> Secure data sharing enabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
