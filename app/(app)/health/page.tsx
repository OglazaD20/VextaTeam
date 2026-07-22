import type { Metadata } from "next";
import { subDays } from "date-fns";
import { DropletIcon, DumbbellIcon, FlameIcon, FootprintsIcon, HeartPulseIcon, MoonIcon, PlusIcon, ScaleIcon } from "lucide-react";

import { HealthCardCustomizer } from "@/components/health/health-card-customizer";
import { HealthDetailedEntryDialog } from "@/components/health/health-detailed-entry-dialog";
import { HealthMetricCard } from "@/components/health/health-metric-card";
import { HealthQuickEditPopover } from "@/components/health/health-quick-edit-popover";
import { HealthTrendsSection } from "@/components/health/health-trends-section";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { WeightLogForm } from "@/components/nutrition/weight-log-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_VISIBLE_HEALTH_CARDS, isHealthCardKey, type HealthCardKey } from "@/lib/health/cards";
import { getTodayKey } from "@/lib/habits/today-key";
import { getTodayRangeUtc } from "@/lib/scheduling/day-range";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const metadata: Metadata = { title: "Health — LifeFlow" };

function toTrend(
  rows: Tables<"health_metrics">[],
  field: (row: Tables<"health_metrics">) => number | null,
) {
  return rows.map((row) => ({
    label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
      new Date(row.logged_for_date),
    ),
    value: field(row),
  }));
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
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
  const { start, end } = getTodayRangeUtc(timeZone);

  const [
    { data: metrics, error: metricsError },
    { data: waterLogs },
    { data: nutritionSettings },
    { data: bodyMetrics },
    { data: userSettings },
  ] = await Promise.all([
    supabase
      .from("health_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_for_date", subDays(new Date(), 89).toISOString().slice(0, 10))
      .order("logged_for_date", { ascending: true }),
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    supabase.from("nutrition_settings").select("water_goal_ml").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("logged_for_date, weight_kg")
      .eq("user_id", user.id)
      .order("logged_for_date", { ascending: true })
      .limit(90),
    supabase.from("user_settings").select("visible_health_cards").eq("user_id", user.id).maybeSingle(),
  ]);

  if (metricsError) throw new Error(`Failed to load health metrics: ${metricsError.message}`);

  const rows = metrics ?? [];
  const today = rows.find((m) => m.logged_for_date === todayKey) ?? null;
  const last7 = rows.slice(-7);

  const visibleCards: HealthCardKey[] =
    (userSettings?.visible_health_cards as string[] | undefined)?.filter(isHealthCardKey) ??
    DEFAULT_VISIBLE_HEALTH_CARDS;
  const isVisible = (key: HealthCardKey) => visibleCards.includes(key);

  const totalWaterMl = (waterLogs ?? []).reduce((sum, w) => sum + w.amount_ml, 0);
  const latestWeight = [...(bodyMetrics ?? [])].reverse().find((m) => m.weight_kg !== null);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Health</h1>
          <p className="text-sm text-muted-foreground">
            Manual tracking — feeds the AI planner and coach. Device sync isn&apos;t available yet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HealthCardCustomizer visible={visibleCards} />
          <HealthDetailedEntryDialog todayKey={todayKey} existing={today} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isVisible("sleep") && (
          <HealthMetricCard
            icon={MoonIcon}
            label="Sleep"
            value={today?.sleep_hours ?? null}
            unit="hrs"
            sevenDayAverage={average(last7.map((r) => r.sleep_hours))}
            action={
              <HealthQuickEditPopover
                todayKey={todayKey}
                title="Sleep"
                fields={[{ name: "sleepHours", label: "Hours slept", step: "0.1", defaultValue: today?.sleep_hours ?? null }]}
                trigger={
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Log sleep">
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
        )}

        {isVisible("steps") && (
          <HealthMetricCard
            icon={FootprintsIcon}
            label="Steps"
            value={today?.steps ?? null}
            unit="steps"
            sevenDayAverage={average(last7.map((r) => r.steps))}
            action={
              <HealthQuickEditPopover
                todayKey={todayKey}
                title="Steps"
                fields={[{ name: "steps", label: "Steps", defaultValue: today?.steps ?? null }]}
                trigger={
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Log steps">
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
        )}

        {isVisible("calories_burned") && (
          <HealthMetricCard
            icon={FlameIcon}
            label="Calories Burned"
            value={today?.calories_burned ?? null}
            unit="kcal"
            sevenDayAverage={average(last7.map((r) => r.calories_burned))}
            action={
              <HealthQuickEditPopover
                todayKey={todayKey}
                title="Calories burned"
                fields={[{ name: "caloriesBurned", label: "Calories burned", defaultValue: today?.calories_burned ?? null }]}
                trigger={
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Log calories burned">
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
        )}

        {isVisible("heart_rate") && (
          <HealthMetricCard
            icon={HeartPulseIcon}
            label="Heart Rate"
            value={today?.resting_heart_rate ?? null}
            unit="bpm"
            sevenDayAverage={average(last7.map((r) => r.resting_heart_rate))}
            action={
              <HealthQuickEditPopover
                todayKey={todayKey}
                title="Resting heart rate"
                fields={[{ name: "restingHeartRate", label: "Resting HR (bpm)", defaultValue: today?.resting_heart_rate ?? null }]}
                trigger={
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Log heart rate">
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
        )}

        {isVisible("workouts") && (
          <HealthMetricCard
            icon={DumbbellIcon}
            label="Workouts"
            value={today?.exercise_minutes ?? null}
            unit={today?.exercise_type ? `min · ${today.exercise_type}` : "min"}
            action={
              <HealthQuickEditPopover
                todayKey={todayKey}
                title="Workout"
                fields={[
                  { name: "exerciseType", label: "Type", type: "text", defaultValue: today?.exercise_type ?? null },
                  { name: "exerciseMinutes", label: "Minutes", defaultValue: today?.exercise_minutes ?? null },
                ]}
                trigger={
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Log workout">
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
            }
          />
        )}

        {isVisible("water") && (
          <Card className="col-span-2 gap-2 py-4 sm:col-span-1">
            <CardContent className="flex flex-col gap-2 px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DropletIcon className="size-3.5" />
                Water Intake
              </div>
              <WaterTracker totalMl={totalWaterMl} goalMl={nutritionSettings?.water_goal_ml ?? 2000} />
            </CardContent>
          </Card>
        )}

        {isVisible("weight") && (
          <Card className="col-span-2 gap-2 py-4 sm:col-span-1">
            <CardContent className="flex flex-col gap-2 px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ScaleIcon className="size-3.5" />
                Weight
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                {latestWeight?.weight_kg ?? "—"} <span className="text-xs font-normal text-muted-foreground">kg</span>
              </p>
              <WeightLogForm todayKey={todayKey} latestKg={latestWeight?.weight_kg ?? null} />
            </CardContent>
          </Card>
        )}
      </div>

      <HealthTrendsSection
        sleepTrend={toTrend(rows, (r) => r.sleep_hours)}
        stepsTrend={toTrend(rows, (r) => r.steps)}
        restingHrTrend={toTrend(rows, (r) => r.resting_heart_rate)}
      />
    </div>
  );
}
