import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { DbUser, DbCompany, UserRole } from "@/types/database";

// ── Auth Store ────────────────────────────────────────────────

interface AuthStoreState {
  user: DbUser | null;
  company: DbCompany | null;
  role: UserRole | null;
  companyId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthStoreActions {
  setAuth: (payload: {
    user: DbUser;
    company: DbCompany | null;
    role: UserRole;
  }) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

const initialState: AuthStoreState = {
  user: null,
  company: null,
  role: null,
  companyId: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setAuth: ({ user, company, role }) =>
          set(
            {
              user,
              company,
              role,
              companyId: user.company_id,
              isLoading: false,
              isAuthenticated: true,
            },
            false,
            "auth/setAuth"
          ),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, "auth/setLoading"),

        clearAuth: () =>
          set(
            { ...initialState, isLoading: false },
            false,
            "auth/clearAuth"
          ),
      }),
      {
        name: "company-dashboard-auth",
        partialize: (state) => ({
          user: state.user,
          company: state.company,
          role: state.role,
          companyId: state.companyId,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);
