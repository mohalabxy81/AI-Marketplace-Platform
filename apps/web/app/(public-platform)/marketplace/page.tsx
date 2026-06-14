/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Search,
  Star,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "AI Marketplace — Discover AI Agents, Tools & Services",
  description:
    "Discover, evaluate, and deploy AI agents, automation tools, and intelligent services. The fastest-growing AI-native marketplace powered by semantic discovery.",
};

// Server-side anon client for public data
async function getPublicListings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("listings")
    .select("id, title, category, type, price, status, images, location, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  return data ?? [];
}

async function getPublicStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count: listingCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  const { count: companyCount } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true });

  return {
    listings: listingCount ?? 0,
    companies: companyCount ?? 0,
  };
}

const CustomLink = Link;

// ── Category pills ─────────────────────────────────────────────

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "AI Agents", value: "ai_agent" },
  { label: "Automation", value: "automation" },
  { label: "Data & Analytics", value: "data_analytics" },
  { label: "NLP & Text", value: "nlp" },
  { label: "Vision & Media", value: "vision" },
  { label: "APIs & Integrations", value: "api" },
  { label: "Consulting", value: "consulting" },
];

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-500/10 text-green-400 border-green-400/20",
  active: "bg-green-500/10 text-green-400 border-green-400/20",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-400/20",
};

// ── Listing Card (Server Component safe) ──────────────────────

function MarketplaceListingCard({
  id,
  title,
  category,
  type,
  price,
  images,
}: {
  id: string;
  title: string;
  category: string;
  type: string;
  price: number;
  images?: string[] | null;
}) {
  return (
    <Link
      href={`/marketplace/listings/${id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)] transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-surface-alt)]">
        {images && images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-8 w-8 text-[var(--color-text-subtle)] opacity-30" />
          </div>
        )}
        {/* Category tag */}
        <div className="absolute top-2 left-2">
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] backdrop-blur-sm">
            {category.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] leading-tight group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-[var(--color-border)]"}`}
              />
            ))}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">(4.0)</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[var(--color-text-muted)] capitalize">
            {type.replace(/_/g, " ")}
          </span>
          <span className="text-sm font-bold font-mono text-[var(--color-text)]">
            ${price?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-text-subtle)]">View details</span>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

// ── Feature highlight ──────────────────────────────────────────

function FeatureBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default async function MarketplacePage() {
  const [listings, stats] = await Promise.all([getPublicListings(), getPublicStats()]);

  return (
    <div className="page-enter">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(245,158,11,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-dim)] px-3 py-1 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            <span className="text-xs font-semibold text-[var(--color-accent)]">
              AI-Native Discovery Engine
            </span>
          </div>

          <h1 className="text-display text-[var(--color-text)] max-w-3xl mx-auto leading-[1.08]">
            The Marketplace for{" "}
            <span className="text-[var(--color-accent)]">Intelligent</span>{" "}
            Services
          </h1>

          <p className="mt-5 text-base text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed">
            Discover AI agents, automation tools, and intelligent services. Powered by semantic
            vector search and real-time personalization.
          </p>

          {/* Hero Search */}
          <div className="mt-8 mx-auto max-w-xl flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 focus-within:border-[var(--color-accent)] transition-colors">
              <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
              <input
                id="hero-search"
                type="search"
                placeholder="Search anything… GPT integrations, data pipelines…"
                className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
            </div>
            <CustomLink
              href="/marketplace/search"
              className="flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              Search <ArrowRight className="h-4 w-4" />
            </CustomLink>
          </div>

          {/* Stats Row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {[
              { label: "Active Listings", value: stats.listings.toLocaleString() },
              { label: "Service Providers", value: stats.companies.toLocaleString() },
              { label: "Avg. Match Score", value: "94%" },
              { label: "Deploy Time", value: "< 48h" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-[var(--color-text)]">{s.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category Pills ───────────────────────────────── */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/marketplace/search${cat.value ? `?category=${cat.value}` : ""}`}
                className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors whitespace-nowrap"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings Grid ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-heading text-[var(--color-text)]">Featured Services</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Top-rated and recently published on the platform
            </p>
          </div>
          <CustomLink
            href="/marketplace/search"
            className="flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
          >
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </CustomLink>
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)]">
            <Sparkles className="h-10 w-10 text-[var(--color-text-subtle)] mb-4" />
            <p className="text-sm font-semibold text-[var(--color-text-muted)]">
              No listings yet — be the first!
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">
              The marketplace is open for new AI services and agents.
            </p>
            <CustomLink
              href="/listings/create"
              className="mt-5 flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              List Your Service <ArrowRight className="h-4 w-4" />
            </CustomLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                category={listing.category ?? "General"}
                type={listing.type ?? "service"}
                price={listing.price ?? 0}
                images={(listing as { images?: string[] }).images}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Why Platform Section ─────────────────────────── */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-label text-[var(--color-accent)] mb-3">WHY AIMARKET</p>
              <h2 className="text-heading text-[var(--color-text)] leading-tight mb-4">
                AI-native discovery that actually works
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Traditional search fails for AI services. Our vector-powered semantic engine matches
                intent, not just keywords — surfacing the exact agent or tool you need within
                milliseconds.
              </p>
              <CustomLink
                href="/marketplace/search"
                className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                Start Exploring <ArrowRight className="h-4 w-4" />
              </CustomLink>
            </div>
            <div className="space-y-6">
              <FeatureBlock
                icon={<Zap className="h-5 w-5 text-[var(--color-accent)]" />}
                title="Sub-50ms Semantic Search"
                description="pgvector HNSW indexes deliver results in under 50ms even with 100K+ listings."
              />
              <FeatureBlock
                icon={<Shield className="h-5 w-5 text-[var(--color-accent)]" />}
                title="Trust-Scored Providers"
                description="Every provider is scored for reliability, quality, and security compliance before listing."
              />
              <FeatureBlock
                icon={<Sparkles className="h-5 w-5 text-[var(--color-accent)]" />}
                title="Personalized AI Feed"
                description="The more you interact, the smarter your feed — powered by real-time preference vectors."
              />
              <FeatureBlock
                icon={<TrendingUp className="h-5 w-5 text-[var(--color-accent)]" />}
                title="Neural Re-Ranking"
                description="Cross-encoder re-ranking ensures the top results are always the most semantically relevant."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div
          className="rounded-[var(--radius-sm)] border border-[var(--color-accent)]/30 p-10 text-center"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)",
          }}
        >
          <Sparkles className="h-8 w-8 text-[var(--color-accent)] mx-auto mb-4" />
          <h2 className="text-heading text-[var(--color-text)] mb-3">
            Ready to list your AI service?
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto mb-6">
            Join the marketplace and reach thousands of buyers actively searching for intelligent
            automation solutions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <CustomLink
              href="/listings/create"
              className="flex items-center gap-2 rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              List Your Service <ArrowRight className="h-4 w-4" />
            </CustomLink>
            <CustomLink
              href="/marketplace/search"
              className="flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
            >
              Browse Listings
            </CustomLink>
          </div>
        </div>
      </section>
    </div>
  );
}
