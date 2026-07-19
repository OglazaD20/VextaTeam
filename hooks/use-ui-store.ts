import { create } from "zustand";

interface UIStore {
  isChatOpen: boolean;
  isFocusModeActive: boolean;
  isQuickAddOpen: boolean;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setFocusModeActive: (active: boolean) => void;
  openQuickAdd: () => void;
  setQuickAddOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isChatOpen: false,
  isFocusModeActive: false,
  isQuickAddOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setFocusModeActive: (active) => set({ isFocusModeActive: active }),
  openQuickAdd: () => set({ isQuickAddOpen: true }),
  setQuickAddOpen: (open) => set({ isQuickAddOpen: open }),
}));
