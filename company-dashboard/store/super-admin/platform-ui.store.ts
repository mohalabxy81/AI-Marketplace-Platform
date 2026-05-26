// store/super-admin/platform-ui.store.ts
import { create } from "zustand";

export interface PlatformAlert {
  id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: Date;
}

interface PlatformUIState {
  sidebarCollapsed: boolean;
  alerts: PlatformAlert[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addAlert: (alert: Omit<PlatformAlert, "createdAt">) => void;
  dismissAlert: (id: string) => void;
}

export const usePlatformUIStore = create<PlatformUIState>((set) => ({
  sidebarCollapsed: false,
  alerts: [],
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  addAlert: (alert) => set((state) => ({
    alerts: [
      { ...alert, createdAt: new Date() },
      ...state.alerts
    ]
  })),
  dismissAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id)
  }))
}));
