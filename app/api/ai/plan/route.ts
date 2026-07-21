import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { fromZonedTime } from "date-fns-tz";

import { getCurrentWeather, type WeatherSnapshot } from "@/lib/activities/weather-client";
import { estimateDurations } from "@/lib/ai/estimate-durations";
import { generatePlanReasoning } from "@/lib/ai/generate-plan-reasoning";
import { getWakingWindowUtc } from "@/lib/scheduling/day-range";
import {
  computePlacementFacts,
  notablePlacementFacts,
  type Chronotype,
} from "@/lib/scheduling/reasoning";
import { solveSchedule } from "@/lib/scheduling/solver";
import type { FixedInterval, FlexibleItem } from "@/lib/scheduling/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as { date?: string });
  const targetDate = typeof body?.date === "string" ? body.date : null;

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    supabase
      .from("user_settings")
      .select("wake_time, sleep_time, default_task_buffer_minutes, chronotype, default_lat, default_lng")
      .eq("user_id", user.id)
      .single(),
  ]);

  const timeZone = profile?.timezone ?? "UTC";
  let reference: Date | undefined;
  if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const [year, month, day] = targetDate.split("-").map(Number);
    reference = fromZonedTime(new Date(year, month - 1, day, 12), timeZone);
  }
  const dayWindow = getWakingWindowUtc(
    timeZone,
    settings?.wake_time ?? "07:00",
    settings?.sleep_time ?? "23:00",
    reference,
  );

  const [{ data: fixedRows, error: fixedError }, { data: flexRows, error: flexError }] =
    await Promise.all([
      supabase
        .from("schedule_items")
        .select("id, title, scheduled_start, scheduled_end")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .not("scheduled_start", "is", null)
        .not("scheduled_end", "is", null)
        .gte("scheduled_start", dayWindow.start.toISOString())
        .lte("scheduled_start", dayWindow.end.toISOString()),
      supabase
        .from("schedule_items")
        .select("id, title, type, priority, estimated_duration_minutes, due_at, habit_id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .is("scheduled_start", null)
        .eq("status", "planned"),
    ]);

  if (fixedError || flexError) {
    return NextResponse.json(
      { error: (fixedError ?? flexError)?.message ?? "Failed to load schedule" },
      { status: 500 },
    );
  }

  if (!flexRows || flexRows.length === 0) {
    return NextResponse.json({ scheduled: 0, unscheduled: 0 });
  }

  const needsEstimate = flexRows.filter((row) => !row.estimated_duration_minutes);
  let estimates: Awaited<ReturnType<typeof estimateDurations>> = [];

  if (needsEstimate.length > 0) {
    try {
      estimates = await estimateDurations(
        needsEstimate.map((row) => ({ id: row.id, title: row.title, type: row.type })),
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI estimation failed" },
        { status: 502 },
      );
    }
  }
  const estimateMap = new Map(estimates.map((e) => [e.id, e]));

  const flexible: FlexibleItem[] = flexRows.map((row) => ({
    id: row.id,
    priority: row.priority,
    durationMinutes:
      row.estimated_duration_minutes ?? estimateMap.get(row.id)?.estimatedDurationMinutes ?? 30,
    dueAt: row.due_at ? new Date(row.due_at) : undefined,
  }));

  const fixed: (FixedInterval & { title: string })[] = (fixedRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    start: new Date(row.scheduled_start!),
    end: new Date(row.scheduled_end!),
  }));

  const result = solveSchedule({
    dayWindow,
    fixed,
    flexible,
    bufferMinutes: settings?.default_task_buffer_minutes ?? 10,
  });

  // Habit preferred-times, for "kept at your usual time" style reasoning.
  const habitIds = [...new Set(flexRows.map((r) => r.habit_id).filter((id): id is string => !!id))];
  const habitPreferredTimeById = new Map<string, string | null>();
  if (habitIds.length > 0) {
    const { data: habits } = await supabase
      .from("habits")
      .select("id, preferred_time")
      .in("id", habitIds);
    for (const h of habits ?? []) habitPreferredTimeById.set(h.id, h.preferred_time);
  }

  const itemsById = new Map(
    flexRows.map((row) => [
      row.id,
      {
        id: row.id,
        title: row.title,
        habitPreferredTime: row.habit_id ? habitPreferredTimeById.get(row.habit_id) : null,
      },
    ]),
  );

  const chronotype = (settings?.chronotype ?? "flexible") as Chronotype;
  const facts = computePlacementFacts(result.placements, fixed, itemsById, chronotype, timeZone);
  const notableFacts = notablePlacementFacts(facts);

  const bumpedTitles = result.unscheduled
    .map((id) => flexRows.find((r) => r.id === id)?.title)
    .filter((t): t is string => !!t);

  let weather: WeatherSnapshot | null = null;
  if (settings?.default_lat != null && settings?.default_lng != null) {
    try {
      weather = await getCurrentWeather({ lat: settings.default_lat, lng: settings.default_lng });
    } catch {
      // Weather is a nice-to-have for reasoning — plan generation shouldn't fail without it.
    }
  }

  let reasoningById = new Map<string, string>();
  let daySummary = "";
  if (notableFacts.length > 0 || bumpedTitles.length > 0) {
    try {
      const reasoning = await generatePlanReasoning({ notableFacts, bumpedTitles, weather });
      reasoningById = new Map(reasoning.itemReasoning.map((r) => [r.id, r.reasoning]));
      daySummary = reasoning.daySummary;
    } catch {
      // Reasoning is an explanation layer — a failure here shouldn't block scheduling.
    }
  }

  await Promise.all(
    result.placements.map((placement) => {
      const flexItem = flexible.find((item) => item.id === placement.id);
      const estimate = estimateMap.get(placement.id);
      const reasoning = reasoningById.get(placement.id) ?? estimate?.reasoning ?? null;

      return supabase
        .from("schedule_items")
        .update({
          scheduled_start: placement.start.toISOString(),
          scheduled_end: placement.end.toISOString(),
          estimated_duration_minutes: flexItem?.durationMinutes,
          ai_reasoning: reasoning,
          source: "ai_suggested",
        })
        .eq("id", placement.id)
        .eq("user_id", user.id);
    }),
  );

  revalidatePath("/today");
  revalidatePath("/calendar/day/[date]", "page");

  return NextResponse.json({
    scheduled: result.placements.length,
    unscheduled: result.unscheduled.length,
    daySummary: daySummary || undefined,
  });
}
