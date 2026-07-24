"use client";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/hooks/use-ui-store";

export function ChatRail() {
  const isChatOpen = useUIStore((state) => state.isChatOpen);
  const setChatOpen = useUIStore((state) => state.setChatOpen);

  return (
    <>
      <aside className="hidden w-80 shrink-0 border-l border-border xl:flex">
        <ChatPanel className="glass-surface w-full" />
      </aside>

      <Sheet open={isChatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-sm xl:hidden">
          <SheetTitle className="sr-only">Assistant</SheetTitle>
          <ChatPanel className="h-full" />
        </SheetContent>
      </Sheet>
    </>
  );
}
