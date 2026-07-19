import type { Metadata } from "next";
import { SparklesIcon } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Assistant — LifeFlow" };

export default function ChatPage() {
  return (
    <>
      <div className="flex h-full flex-col xl:hidden">
        <ChatPanel className="flex-1" />
      </div>
      <EmptyState
        icon={SparklesIcon}
        title="Assistant is open in the side panel"
        description="On larger screens the assistant lives in the panel to the right."
        className="hidden xl:flex xl:h-full"
      />
    </>
  );
}
