"use client";


import { useAuth } from "@/hooks/use-auth";

/**
 * AuthProvider initializes the Supabase auth listener on mount.
 * Wrap this inside QueryProvider in the root layout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // useAuth() sets up the onAuthStateChange listener
  useAuth();

  return <>{children}</>;
}
