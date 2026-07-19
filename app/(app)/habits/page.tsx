import type { Metadata } from "next";
import { ListChecksIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Habits — LifeFlow" };

export default function HabitsPage() {
  return (
    <EmptyState
      icon={ListChecksIcon}
      title="Track the routines that matter"
      description="Sleep, gym, water, reading, meditation, walking — add habits here and LifeFlow will track streaks and nudge you when one slips."
    />
  );
}
