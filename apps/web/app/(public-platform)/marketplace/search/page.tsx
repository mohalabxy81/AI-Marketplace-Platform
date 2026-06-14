/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles, Star, ChevronRight, ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Search — AI Marketplace",
  description: "Search AI agents, automation tools, and intelligent services with semantic vector discovery.",
};

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Active", value: "published" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "created_at-desc" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
];

const CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "AI Agents", value: "ai_agent" },
  { label: "Automation", value: "automation" },
  { label: "Data & Analytics", value: "data_analytics" },
  { label: "NLP & Text", value: "nlp" },
  { label: "Vision & Media", value: "vision" },
  { label: "APIs & Integrations", value: "api" },
  { label: "Consulting", value: "consulting" },
];

async function searchListings({
  q,
  category,
  sort,
}: {
  q?: string;
  category?: string;
  sort?: string;
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from("listings")
    .select("id, title, category, type, price, status, images, location, created_at")
    .eq("status", "published");

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }

  const [sortField, sortDir] = (sort ?? "created_at-desc").split("-");
  query = query.order(sortField ?? "created_at", {
    ascending: sortDir === "asc",
  });

  const { data, count } = await query.limit(24);
  return { results: data ?? [], total: count ?? (data?.length ?? 0) };
}

// ── Result Card ───────────────────────────────────────────────

function ResultCard({
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
      className="group flex gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent)]/50 transition-all"
    >
      {/* Thumbnail */}
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)]">
        {images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[0]}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-5 w-5 text-[var(--color-text-subtle)] opacity-30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <p className="text-xs text-[var(--color-accent)] font-medium uppercase tracking-wide mb-1">
            {category.replace(/_/g, " ")}
          </p>
          <h3 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] capitalize mt-1">
            {type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < 4 ? "fill-amber-400 text-amber-400" : "text-[var(--color-border)]"}`}
              />
            ))}
            <span className="ml-1 text-[10px] text-[var(--color-text-muted)]">4.0</span>
          </span>
          <span className="text-sm font-bold font-mono text-[var(--color-text)]">
            ${price?.toLocaleString()}
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] self-center transition-colors" />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default async function MarketplaceSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const { q, category, sort } = params;
  const { results, total } = await searchListings({ q, category, sort });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-6">
        <Link href="/marketplace" className="hover:text-[var(--color-text)] flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Marketplace
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Search</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar Filters ─────────────────────────── */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="sticky top-20 space-y-6">
            <form method="GET">
              {q && <input type="hidden" name="q" value={q} />}
              {sort && <input type="hidden" name="sort" value={sort} />}

              <div>
                <p className="text-label text-[var(--color-text-muted)] mb-2">Category</p>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        defaultChecked={category === cat.value || (!category && cat.value === "")}
                        className="accent-[var(--color-accent)]"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* ── Results ─────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Search bar + sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form method="GET" className="flex-1 flex gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              {sort && <input type="hidden" name="sort" value={sort} />}
              <div className="flex-1 flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-accent)] transition-colors">
                <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                <input
                  name="q"
                  defaultValue={q}
                  type="search"
                  placeholder="Search listings…"
                  className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                Search
              </button>
            </form>

            <form method="GET">
              {q && <input type="hidden" name="q" value={q} />}
              {category && <input type="hidden" name="category" value={category} />}
              <div className="flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                <select
                  name="sort"
                  defaultValue={sort}
                  onChange={(e) => (e.target.form as HTMLFormElement)?.submit()}
                  className="bg-transparent text-xs text-[var(--color-text)] focus:outline-none appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[var(--color-surface)]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* Result count */}
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            {q ? (
              <>
                <span className="font-medium text-[var(--color-text)]">{total}</span> results for "
                <span className="font-medium text-[var(--color-accent)]">{q}</span>"
              </>
            ) : (
              <>
                Showing <span className="font-medium text-[var(--color-text)]">{results.length}</span> listings
                {category ? ` in "${category.replace(/_/g, " ")}"` : ""}
              </>
            )}
          </p>

          {/* Results grid */}
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)]">
              <Search className="h-10 w-10 text-[var(--color-text-subtle)] mb-4" />
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">No results found</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                Try a different search term or category
              </p>
              <Link
                href="/marketplace/search"
                className="mt-5 text-xs text-[var(--color-accent)] hover:underline"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((listing) => (
                <ResultCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  category={(listing as { category?: string }).category ?? "General"}
                  type={(listing as { type?: string }).type ?? "service"}
                  price={(listing as { price?: number }).price ?? 0}
                  images={(listing as { images?: string[] }).images}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
