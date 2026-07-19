import type { Metadata } from "next";
import { LayoutDashboardIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Today — LifeFlow" };

export default function TodayPage() {
  return (
    <EmptyState
      icon={LayoutDashboardIcon}
      title="Your timeline will live here"
      description="Once the scheduling engine is wired up, this is where LifeFlow shows your AI-planned day — meetings, tasks, habits, and breaks on one timeline."
    />
  );
}
