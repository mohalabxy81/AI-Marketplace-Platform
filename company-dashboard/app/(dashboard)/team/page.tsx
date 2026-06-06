"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Mail,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Metadata } from "next";

// ── Types ──────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  joined_at: string | null;
  avatar_url: string | null;
}

// ── Role config ────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  agent: {
    label: "Agent",
    icon: User,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  member: {
    label: "Member",
    icon: User,
    color: "text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-[var(--color-border)]",
  },
};

// ── Fetch ──────────────────────────────────────────────────────

interface UserSelectResult {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  avatar_url: string | null;
}

async function fetchTeamMembers(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, status, created_at, avatar_url")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((u: UserSelectResult) => ({
    id: u.id,
    email: u.email ?? "",
    full_name: u.full_name,
    role: u.role ?? "member",
    status: u.status ?? "active",
    joined_at: u.created_at,
    avatar_url: u.avatar_url,
  }));
}


// ── Avatar ─────────────────────────────────────────────────────

function MemberAvatar({ name, src }: { name: string | null; src: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "Member"}
        className="h-9 w-9 rounded-[var(--radius-xs)] object-cover"
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)]">
      {initials}
    </div>
  );
}

// ── Role Badge ─────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.member;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-[var(--radius-xs)] ${meta.color}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isActive ? "text-emerald-400" : "text-[var(--color-text-muted)]"}`}>
      {isActive ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {isActive ? "Active" : "Pending"}
    </span>
  );
}

// ── Invite Modal (lightweight inline) ─────────────────────────

function InviteRow({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [sending, setSending] = useState(false);

  async function handleInvite() {
    if (!email.trim()) return;
    setSending(true);
    // Placeholder — real implementation would call an Edge Function / API
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    onClose();
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-accent)]/40 bg-[var(--color-accent-dim)] p-4 mb-4">
      <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3">
        Invite Team Member
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="invite-email"
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-9 px-3 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 px-3 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
        <Button size="sm" onClick={handleInvite} isLoading={sending} leftIcon={<Mail className="h-3.5 w-3.5" />}>
          Send Invite
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Member Row ─────────────────────────────────────────────────

function MemberRow({ member }: { member: TeamMember }) {
  const joinedDate = member.joined_at
    ? new Date(member.joined_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors group">
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <MemberAvatar name={member.full_name} src={member.avatar_url} />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {member.full_name ?? "Unnamed"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <RoleBadge role={member.role} />
      </td>
      <td className="py-3 px-3">
        <StatusBadge status={member.status} />
      </td>
      <td className="py-3 px-3 text-xs text-[var(--color-text-muted)]">{joinedDate}</td>
      <td className="py-3 pl-3 pr-4 text-right">
        <button
          aria-label="Member actions"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function TeamPage() {
  const { company } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", company?.id],
    queryFn: () => fetchTeamMembers(company!.id),
    enabled: !!company?.id,
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const roleBreakdown = Object.entries(
    members.reduce<Record<string, number>>((acc, m) => {
      acc[m.role] = (acc[m.role] ?? 0) + 1;
      return acc;
    }, {})
  );

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Team</PageTitle>
          <PageDescription>
            Manage your workspace members, roles, and access permissions.
          </PageDescription>
        </div>
        <Button
          leftIcon={<UserPlus className="h-4 w-4" />}
          onClick={() => setShowInvite((v) => !v)}
          id="invite-member-btn"
        >
          Invite Member
        </Button>
      </PageHeader>

      <PageContent className="space-y-6">
        {/* Role summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-[var(--radius-sm)] border border-[var(--color-border)]" />
              ))
            : Object.entries(ROLE_META).map(([roleKey, meta]) => {
                const Icon = meta.icon;
                const count = members.filter((m) => m.role === roleKey).length;
                return (
                  <div
                    key={roleKey}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-3"
                  >
                    <div className={`p-1.5 rounded-[var(--radius-xs)] border ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--color-text)]">{count}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {meta.label}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Invite form */}
        {showInvite && <InviteRow onClose={() => setShowInvite(false)} />}

        {/* Search + table */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* Table header bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
              <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
              Members ({filtered.length})
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-subtle)]" />
              <input
                id="team-search"
                type="text"
                placeholder="Search members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-[var(--color-border)]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="skeleton h-9 w-9 rounded-[var(--radius-xs)]" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-40 rounded-[var(--radius-xs)]" />
                    <div className="skeleton h-2.5 w-28 rounded-[var(--radius-xs)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-t border-[var(--color-border)]">
              <Users className="h-8 w-8 text-[var(--color-text-subtle)] mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">
                {search ? "No members match your search" : "No team members yet"}
              </p>
              {!search && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setShowInvite(true)}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Invite your first member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="py-2.5 pl-4 pr-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Member
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Role
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Joined
                    </th>
                    <th className="py-2.5 pl-3 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member) => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Permissions note */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="text-xs font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
            Role Permissions Reference
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_META).map(([roleKey, meta]) => {
              const Icon = meta.icon;
              const permissions: Record<string, string[]> = {
                owner: ["Manage billing", "All team actions", "Delete workspace", "All admin access"],
                admin: ["Manage team", "Manage listings", "View analytics", "Configure settings"],
                agent: ["Manage listings", "Respond to messages", "View analytics", "Update profile"],
                member: ["View listings", "View team", "Basic analytics", "Update profile"],
              };
              return (
                <div key={roleKey}>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-[var(--radius-xs)] mb-2 ${meta.color}`}>
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
                  </div>
                  <ul className="space-y-1">
                    {(permissions[roleKey] ?? []).map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
