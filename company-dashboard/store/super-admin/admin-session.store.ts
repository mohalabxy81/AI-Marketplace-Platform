// store/super-admin/admin-session.store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type AdminRole, type AdminCapability } from "@/types/super-admin/admin";
import { ADMIN_ROLE_CAPABILITIES } from "@/lib/supabase/admin-permissions";

export interface AdminSessionProfile {
  id: string;
  userId: string;
  role: AdminRole;
  isActive: boolean;
  email?: string;
  fullName?: string;
}

export interface ImpersonationState {
  isActive: boolean;
  sessionId?: string;
  targetUserId?: string;
  targetCompanyId?: string;
  justification?: string;
  startedAt?: string;
  expiresAt?: string;
}

interface AdminSessionState {
  admin: AdminSessionProfile | null;
  impersonation: ImpersonationState;
  isSessionHydrated: boolean;

  // Actions
  setAdminSession: (admin: AdminSessionProfile) => void;
  clearSession: () => void;
  startImpersonation: (params: Omit<ImpersonationState, "isActive">) => void;
  endImpersonation: () => void;
  hasCapability: (capability: AdminCapability) => boolean;
}

export const useAdminSessionStore = create<AdminSessionState>()(
  devtools(
    (set, get) => ({
      admin: null,
      impersonation: { isActive: false },
      isSessionHydrated: false,

      setAdminSession: (admin) =>
        set({ admin, isSessionHydrated: true }, false, "admin/setSession"),

      clearSession: () =>
        set(
          { admin: null, impersonation: { isActive: false }, isSessionHydrated: false },
          false,
          "admin/clearSession"
        ),

      startImpersonation: (params) =>
        set(
          { impersonation: { isActive: true, ...params } },
          false,
          "admin/startImpersonation"
        ),

      endImpersonation: () =>
        set(
          { impersonation: { isActive: false } },
          false,
          "admin/endImpersonation"
        ),

      hasCapability: (capability: AdminCapability): boolean => {
        const { admin } = get();
        if (!admin) return false;
        return ADMIN_ROLE_CAPABILITIES[admin.role]?.includes(capability) ?? false;
      },
    }),
    { name: "admin-session-store" }
  )
);
