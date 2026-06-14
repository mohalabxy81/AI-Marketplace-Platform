import type { Metadata } from "next";
import Link from "next/link";
import { Search, Sparkles, Store, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Marketplace — Discover AI Agents, Tools & Services",
  description:
    "The premier AI-native marketplace. Discover, evaluate, and hire AI agents, automation tools, and intelligent services powered by real-time semantic discovery.",
};

export default function PublicMarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* ── Top Navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/marketplace" className="flex items-center gap-2 shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-accent)]">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <span className="font-bold text-[var(--color-text)] tracking-tight">
                AI<span className="text-[var(--color-accent)]">Market</span>
              </span>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-xl hidden sm:flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-accent)] transition-colors">
              <Search className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
              <input
                type="search"
                placeholder="Search AI agents, tools, services…"
                className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <Link
                href="/marketplace/search"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-[var(--radius-xs)]"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Link>
              <Link
                href="/overview"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-[var(--radius-xs)]"
              >
                <Store className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <Link
                href="/listings/create"
                className="flex items-center gap-1.5 rounded-[var(--radius-xs)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                List Service
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-accent)]">
                  <Sparkles className="h-3.5 w-3.5 text-black" />
                </div>
                <span className="font-bold text-[var(--color-text)]">
                  AI<span className="text-[var(--color-accent)]">Market</span>
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                The premier AI-native marketplace operating system for the intelligent economy.
              </p>
            </div>
            {[
              { title: "Marketplace", links: ["Browse All", "AI Agents", "Tools", "Services", "Search"] },
              { title: "Sellers", links: ["List Service", "Dashboard", "Analytics", "Billing"] },
              { title: "Platform", links: ["About", "Pricing", "Blog", "Status", "Support"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--color-text-subtle)]">
              © {new Date().getFullYear()} AIMarket. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["Privacy", "Terms", "Cookies"].map((l) => (
                <a key={l} href="#" className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors">
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
