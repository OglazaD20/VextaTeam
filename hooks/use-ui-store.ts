import { create } from "zustand";

interface UIStore {
  isChatOpen: boolean;
  isFocusModeActive: boolean;
  isQuickAddOpen: boolean;
  /** A question to pre-fill into the assistant's chat input, consumed once by ChatPanel — e.g. "Ask AI about this place." */
  draftChatMessage: string | null;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setFocusModeActive: (active: boolean) => void;
  openQuickAdd: () => void;
  setQuickAddOpen: (open: boolean) => void;
  askAssistant: (message: string) => void;
  clearDraftChatMessage: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isChatOpen: false,
  isFocusModeActive: false,
  isQuickAddOpen: false,
  draftChatMessage: null,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setFocusModeActive: (active) => set({ isFocusModeActive: active }),
  openQuickAdd: () => set({ isQuickAddOpen: true }),
  setQuickAddOpen: (open) => set({ isQuickAddOpen: open }),
  askAssistant: (message) => set({ draftChatMessage: message, isChatOpen: true }),
  clearDraftChatMessage: () => set({ draftChatMessage: null }),
}));
