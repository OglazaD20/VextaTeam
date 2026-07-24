import type { Metadata } from "next";

import { getMoodLogs } from "@/app/(app)/mood/actions";
import { MoodChart } from "@/components/mood/mood-chart";
import { MoodLogDialog } from "@/components/mood/mood-log-dialog";
import { MoodTimeline } from "@/components/mood/mood-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeDailyMoodAverages } from "@/lib/mood/daily-average";

export const metadata: Metadata = { title: "Mood — LifeFlow" };

export default async function MoodPage() {
  const result = await getMoodLogs(30);
  const logs = result.data ?? [];

  const dailyAverages = computeDailyMoodAverages(
    logs.map((l) => ({
      loggedForDate: l.logged_for_date,
      mood: l.mood,
      energy: l.energy,
      stress: l.stress,
    })),
  );

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mood</h1>
          <p className="text-sm text-muted-foreground">
            Quick check-ins, tracked over time.
          </p>
        </div>
        <MoodLogDialog />
      </div>

      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              <MoodChart points={dailyAverages} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Timeline</h2>
            <MoodTimeline logs={logs} />
          </div>
        </>
      )}
    </div>
  );
}
