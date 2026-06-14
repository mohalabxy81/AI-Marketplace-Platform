import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ── Sidebar Store ─────────────────────────────────────────────

interface SidebarStoreState {
  isOpen: boolean;       // mobile drawer open
  isCollapsed: boolean;  // desktop collapsed (icon-only)
}

interface SidebarStoreActions {
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

type SidebarStore = SidebarStoreState & SidebarStoreActions;

export const useSidebarStore = create<SidebarStore>()(
  devtools(
    (set) => ({
      isOpen: false,
      isCollapsed: false,

      toggleOpen: () =>
        set((s) => ({ isOpen: !s.isOpen }), false, "sidebar/toggleOpen"),

      setOpen: (open) =>
        set({ isOpen: open }, false, "sidebar/setOpen"),

      toggleCollapsed: () =>
        set(
          (s) => ({ isCollapsed: !s.isCollapsed }),
          false,
          "sidebar/toggleCollapsed"
        ),

      setCollapsed: (collapsed) =>
        set({ isCollapsed: collapsed }, false, "sidebar/setCollapsed"),
    }),
    { name: "SidebarStore" }
  )
);
