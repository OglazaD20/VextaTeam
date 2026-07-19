import type { Metadata } from "next";
import { CalendarClockIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Stats — LifeFlow" };

export default function StatsPage() {
  return (
    <EmptyState
      icon={CalendarClockIcon}
      title="Your weekly report will appear here"
      description="Productive hours, focus score, habit streaks, mood trends, and AI recommendations — generated every week once you have data to show."
    />
  );
}
