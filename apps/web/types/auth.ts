import type { User, Session } from "@supabase/supabase-js";
import type { DbUser, DbCompany, UserRole } from "./database";

// ── Auth Types ────────────────────────────────────────────────

export interface AuthUser extends User {
  profile?: DbUser;
}

export interface AuthSession {
  session: Session | null;
  user: AuthUser | null;
}

// ── Company Context (multi-tenant scope) ──────────────────────

export interface CompanyContext {
  companyId: string;
  company: DbCompany;
  role: UserRole;
  isOwner: boolean;
}

// ── Auth Store State ──────────────────────────────────────────

export interface AuthState {
  user: DbUser | null;
  company: DbCompany | null;
  role: UserRole | null;
  companyId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
