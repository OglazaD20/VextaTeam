import type { Metadata } from "next";
import { subDays } from "date-fns";

import { HealthLogForm } from "@/components/health/health-log-form";
import { HealthTrendChart, type TrendPoint } from "@/components/health/health-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTodayKey } from "@/lib/habits/today-key";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const metadata: Metadata = { title: "Health — LifeFlow" };

function toTrend(
  rows: Tables<"health_metrics">[],
  field: (row: Tables<"health_metrics">) => number | null,
): TrendPoint[] {
  return rows.map((row) => ({
    label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
      new Date(row.logged_for_date),
    ),
    value: field(row),
  }));
}

export default async function HealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";
  const todayKey = getTodayKey(timeZone);

  const { data: metrics, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_for_date", subDays(new Date(), 29).toISOString().slice(0, 10))
    .order("logged_for_date", { ascending: true });

  if (error) throw new Error(`Failed to load health metrics: ${error.message}`);

  const rows = metrics ?? [];
  const today = rows.find((m) => m.logged_for_date === todayKey) ?? null;

  const sleepTrend = toTrend(rows, (r) => r.sleep_hours);
  const stepsTrend = toTrend(rows, (r) => r.steps);
  const restingHrTrend = toTrend(rows, (r) => r.resting_heart_rate);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-muted-foreground">
          Manual sleep, activity, and heart-rate tracking — feeds the AI planner and coach.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthLogForm todayKey={todayKey} existing={today} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleep (hrs)</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthTrendChart data={sleepTrend} unit="hrs" emptyMessage="Log your sleep to see the trend here." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthTrendChart data={stepsTrend} unit="steps" emptyMessage="Log your steps to see the trend here." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resting heart rate</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthTrendChart
            data={restingHrTrend}
            unit="bpm"
            emptyMessage="Log your resting heart rate to see the trend here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
