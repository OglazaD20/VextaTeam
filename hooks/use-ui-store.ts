import { create } from "zustand";

interface UIStore {
  isChatOpen: boolean;
  isFocusModeActive: boolean;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setFocusModeActive: (active: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isChatOpen: false,
  isFocusModeActive: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setFocusModeActive: (active) => set({ isFocusModeActive: active }),
}));
