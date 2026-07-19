import type { Metadata } from "next";
import { TimerIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Focus — LifeFlow" };

export default function FocusPage() {
  return (
    <EmptyState
      icon={TimerIcon}
      title="Deep work, protected"
      description="Focus Mode will start a Pomodoro timer, mute non-critical notifications, and log your deep work sessions."
    />
  );
}
