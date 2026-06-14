// store/super-admin/moderation-queue.store.ts
import { create } from "zustand";
import { type ModerationPriority, type ModerationStatus } from "@/types/super-admin/trust";

interface ModerationFilters {
  priority: ModerationPriority | "ALL";
  status: ModerationStatus | "ALL";
  targetType: "ALL" | "listing" | "user";
  search: string;
}

interface ModerationQueueState {
  filters: ModerationFilters;
  selectedIds: string[];
  setPriorityFilter: (priority: ModerationPriority | "ALL") => void;
  setStatusFilter: (status: ModerationStatus | "ALL") => void;
  setTargetTypeFilter: (targetType: "ALL" | "listing" | "user") => void;
  setSearchFilter: (search: string) => void;
  resetFilters: () => void;
  toggleSelectId: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useModerationQueueStore = create<ModerationQueueState>((set) => ({
  filters: {
    priority: "ALL",
    status: "PENDING", // default to pending queue
    targetType: "ALL",
    search: ""
  },
  selectedIds: [],
  setPriorityFilter: (priority) =>
    set((state) => ({ filters: { ...state.filters, priority } })),
  setStatusFilter: (status) =>
    set((state) => ({ filters: { ...state.filters, status } })),
  setTargetTypeFilter: (targetType) =>
    set((state) => ({ filters: { ...state.filters, targetType } })),
  setSearchFilter: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),
  resetFilters: () =>
    set({
      filters: {
        priority: "ALL",
        status: "PENDING",
        targetType: "ALL",
        search: ""
      }
    }),
  toggleSelectId: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      const selectedIds = isSelected
        ? state.selectedIds.filter((item) => item !== id)
        : [...state.selectedIds, id];
      return { selectedIds };
    }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] })
}));
