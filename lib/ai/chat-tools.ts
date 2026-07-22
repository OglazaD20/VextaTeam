import { addDays, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

import { getCurrentWeather } from "@/lib/activities/weather-client";
import { computeBudgetUsage, computeCashFlow, computeSpendingByCategory } from "@/lib/finance/calculations";
import { computeGoalProgressPct } from "@/lib/goals/progress";
import { embedText } from "@/lib/memory/embed";
import { getTodayKey } from "@/lib/habits/today-key";
import { computeFreeGaps } from "@/lib/scheduling/gaps";
import { getTodayRangeUtc, getWakingWindowUtc } from "@/lib/scheduling/day-range";
import { solveSchedule } from "@/lib/scheduling/solver";
import type { FixedInterval, FlexibleItem } from "@/lib/scheduling/types";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ToolContext {
  supabase: SupabaseServerClient;
  userId: string;
  timeZone: string;
}

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Get the user's scheduled items (meetings, tasks, deadlines, habits, breaks) for today or tomorrow, plus items still waiting to be scheduled. Always call this before referencing an item's id.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", enum: ["today", "tomorrow"] },
        },
        required: ["day"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_free_slots",
      description: "Get the free time gaps in the user's day, within their waking hours.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", enum: ["today", "tomorrow"] },
        },
        required: ["day"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description:
        "Add a new item to the schedule. Omit startTime to add it unscheduled — it gets placed automatically the next time replan_day runs.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["meeting", "task", "deadline", "appointment", "break"],
          },
          durationMinutes: { type: "integer", minimum: 5, maximum: 480 },
          startTime: {
            type: ["string", "null"],
            description: "ISO 8601 datetime, only if the user specified an exact time.",
          },
          dueAt: {
            type: ["string", "null"],
            description: "ISO 8601 datetime deadline, if any.",
          },
          priority: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            description: "1 = most urgent, 5 = someday. Default 3.",
          },
        },
        required: ["title", "type", "durationMinutes", "startTime", "dueAt", "priority"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_complete",
      description: "Mark a schedule item as completed.",
      parameters: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Remove a schedule item entirely.",
      parameters: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replan_day",
      description:
        "Re-place all non-fixed, incomplete items scheduled today from a given time onward (default now), fitting them into free gaps by priority — same engine as the 'Plan my day' button. Use this for 'move everything after 3pm' (fromTime='15:00') or 'plan my day' / 'can I fit X today' (no fromTime, after adding the item with add_task first).",
      parameters: {
        type: "object",
        properties: {
          fromTime: {
            type: ["string", "null"],
            description: "24h HH:mm in the user's local time, e.g. '15:00'. Null means starting now.",
          },
        },
        required: ["fromTime"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_goals",
      description: "Get the user's active goals with computed progress, deadline, and category.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mood_summary",
      description:
        "Get the user's mood/stress/energy check-ins from the last 7 days, averaged, plus the most recent note if any.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finance_summary",
      description:
        "Get this month's income/expenses/net, spending by category, budget status, and any subscriptions billing in the next 7 days.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_summary",
      description: "Get today's calories/macros eaten so far and how much is left toward the user's goal.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get the current weather at the user's saved default location. Returns an error if no location is set — tell the user to set one in Settings if so.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description:
        "Semantic search over everything the user has saved/logged across the app (tasks, goals, discover saves, finance, mood notes) — use this for 'what did I...', 'when did I...', 'what was that place/gift/thing I saved' style questions.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_mood",
      description: "Log a quick mood check-in when the user mentions how they're feeling in conversation.",
      parameters: {
        type: "object",
        properties: {
          mood: { type: "integer", minimum: 1, maximum: 5, description: "1 = very low, 5 = great" },
          note: { type: ["string", "null"] },
        },
        required: ["mood", "note"],
        additionalProperties: false,
      },
    },
  },
];

function referenceForDay(day: "today" | "tomorrow") {
  return day === "tomorrow" ? addDays(new Date(), 1) : new Date();
}

async function getSchedule(ctx: ToolContext, args: { day?: "today" | "tomorrow" }) {
  const { start, end } = getTodayRangeUtc(ctx.timeZone, referenceForDay(args.day ?? "today"));

  const { data: scheduled } = await ctx.supabase
    .from("schedule_items")
    .select(
      "id, title, type, status, priority, scheduled_start, scheduled_end, due_at, estimated_duration_minutes, is_fixed",
    )
    .eq("user_id", ctx.userId)
    .is("deleted_at", null)
    .gte("scheduled_start", start.toISOString())
    .lte("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true });

  const { data: unscheduled } = await ctx.supabase
    .from("schedule_items")
    .select("id, title, type, status, priority, due_at, estimated_duration_minutes")
    .eq("user_id", ctx.userId)
    .is("deleted_at", null)
    .is("scheduled_start", null)
    .eq("status", "planned");

  return { scheduled: scheduled ?? [], unscheduled: unscheduled ?? [] };
}

async function getFreeSlots(ctx: ToolContext, args: { day?: "today" | "tomorrow" }) {
  const { data: settings } = await ctx.supabase
    .from("user_settings")
    .select("wake_time, sleep_time")
    .eq("user_id", ctx.userId)
    .single();

  const dayWindow = getWakingWindowUtc(
    ctx.timeZone,
    settings?.wake_time ?? "07:00",
    settings?.sleep_time ?? "23:00",
    referenceForDay(args.day ?? "today"),
  );

  const { data: fixedRows } = await ctx.supabase
    .from("schedule_items")
    .select("scheduled_start, scheduled_end")
    .eq("user_id", ctx.userId)
    .is("deleted_at", null)
    .not("scheduled_start", "is", null)
    .not("scheduled_end", "is", null)
    .gte("scheduled_start", dayWindow.start.toISOString())
    .lte("scheduled_start", dayWindow.end.toISOString());

  const busy = (fixedRows ?? []).map((r) => ({
    start: new Date(r.scheduled_start!),
    end: new Date(r.scheduled_end!),
  }));

  return computeFreeGaps(dayWindow, busy).map((gap) => ({
    start: gap.start.toISOString(),
    end: gap.end.toISOString(),
  }));
}

async function addTask(
  ctx: ToolContext,
  args: {
    title: string;
    type: string;
    durationMinutes: number;
    startTime: string | null;
    dueAt: string | null;
    priority: number;
  },
) {
  const scheduledStart = args.startTime ? new Date(args.startTime) : null;
  const scheduledEnd = scheduledStart
    ? new Date(scheduledStart.getTime() + args.durationMinutes * 60_000)
    : null;

  const { data, error } = await ctx.supabase
    .from("schedule_items")
    .insert({
      user_id: ctx.userId,
      title: args.title,
      type: args.type as "meeting" | "task" | "deadline" | "appointment" | "break",
      priority: args.priority ?? 3,
      estimated_duration_minutes: args.durationMinutes,
      scheduled_start: scheduledStart?.toISOString() ?? null,
      scheduled_end: scheduledEnd?.toISOString() ?? null,
      due_at: args.dueAt ?? null,
      source: "ai_suggested",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to add the task" };
  }
  return { id: data.id, scheduled: !!scheduledStart };
}

async function markComplete(ctx: ToolContext, args: { itemId: string }) {
  const { error } = await ctx.supabase
    .from("schedule_items")
    .update({ status: "completed" })
    .eq("id", args.itemId)
    .eq("user_id", ctx.userId);
  return error ? { error: error.message } : { success: true };
}

async function deleteTask(ctx: ToolContext, args: { itemId: string }) {
  const { error } = await ctx.supabase
    .from("schedule_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", args.itemId)
    .eq("user_id", ctx.userId);
  return error ? { error: error.message } : { success: true };
}

async function replanDay(ctx: ToolContext, args: { fromTime: string | null }) {
  const { data: settings } = await ctx.supabase
    .from("user_settings")
    .select("wake_time, sleep_time, default_task_buffer_minutes")
    .eq("user_id", ctx.userId)
    .single();

  const dayWindowFull = getWakingWindowUtc(
    ctx.timeZone,
    settings?.wake_time ?? "07:00",
    settings?.sleep_time ?? "23:00",
  );

  let windowStart = new Date();
  if (args.fromTime) {
    const [hours, minutes] = args.fromTime.split(":").map(Number);
    const nowInZone = toZonedTime(new Date(), ctx.timeZone);
    const localCutoff = setSeconds(setMinutes(setHours(startOfDay(nowInZone), hours), minutes), 0);
    windowStart = fromZonedTime(localCutoff, ctx.timeZone);
  }
  if (windowStart.getTime() < dayWindowFull.start.getTime()) {
    windowStart = dayWindowFull.start;
  }
  const dayWindow = { start: windowStart, end: dayWindowFull.end };

  const [{ data: movable }, { data: waiting }, { data: allTodayFixed }] = await Promise.all([
    ctx.supabase
      .from("schedule_items")
      .select("id, priority, estimated_duration_minutes, due_at")
      .eq("user_id", ctx.userId)
      .is("deleted_at", null)
      .eq("is_fixed", false)
      .neq("status", "completed")
      .not("scheduled_start", "is", null)
      .gte("scheduled_start", windowStart.toISOString())
      .lte("scheduled_start", dayWindowFull.end.toISOString()),
    ctx.supabase
      .from("schedule_items")
      .select("id, priority, estimated_duration_minutes, due_at")
      .eq("user_id", ctx.userId)
      .is("deleted_at", null)
      .is("scheduled_start", null)
      .eq("status", "planned"),
    ctx.supabase
      .from("schedule_items")
      .select("id, scheduled_start, scheduled_end")
      .eq("user_id", ctx.userId)
      .is("deleted_at", null)
      .not("scheduled_start", "is", null)
      .not("scheduled_end", "is", null)
      .gte("scheduled_start", dayWindowFull.start.toISOString())
      .lte("scheduled_start", dayWindowFull.end.toISOString()),
  ]);

  const movableIds = new Set((movable ?? []).map((row) => row.id));
  const fixed: FixedInterval[] = (allTodayFixed ?? [])
    .filter((row) => !movableIds.has(row.id))
    .map((row) => ({
      id: row.id,
      start: new Date(row.scheduled_start!),
      end: new Date(row.scheduled_end!),
    }));

  const flexible: FlexibleItem[] = [...(movable ?? []), ...(waiting ?? [])].map((row) => ({
    id: row.id,
    priority: row.priority,
    durationMinutes: row.estimated_duration_minutes ?? 30,
    dueAt: row.due_at ? new Date(row.due_at) : undefined,
  }));

  if (flexible.length === 0) {
    return { moved: 0, unscheduled: 0 };
  }

  const result = solveSchedule({
    dayWindow,
    fixed,
    flexible,
    bufferMinutes: settings?.default_task_buffer_minutes ?? 10,
  });

  await Promise.all([
    ...result.placements.map((placement) =>
      ctx.supabase
        .from("schedule_items")
        .update({
          scheduled_start: placement.start.toISOString(),
          scheduled_end: placement.end.toISOString(),
          source: "ai_suggested",
        })
        .eq("id", placement.id)
        .eq("user_id", ctx.userId),
    ),
    ...result.unscheduled.map((id) =>
      ctx.supabase
        .from("schedule_items")
        .update({ scheduled_start: null, scheduled_end: null })
        .eq("id", id)
        .eq("user_id", ctx.userId),
    ),
  ]);

  return { moved: result.placements.length, unscheduled: result.unscheduled.length };
}

async function getGoals(ctx: ToolContext) {
  const { data: goals } = await ctx.supabase
    .from("goals")
    .select("id, title, category, deadline, target_value, current_value, manual_progress_pct")
    .eq("user_id", ctx.userId)
    .eq("status", "active");

  if (!goals || goals.length === 0) return { goals: [] };

  const { data: milestones } = await ctx.supabase
    .from("goal_milestones")
    .select("goal_id, is_completed")
    .in(
      "goal_id",
      goals.map((g) => g.id),
    );

  const milestonesByGoal = new Map<string, { isCompleted: boolean }[]>();
  for (const m of milestones ?? []) {
    if (!milestonesByGoal.has(m.goal_id)) milestonesByGoal.set(m.goal_id, []);
    milestonesByGoal.get(m.goal_id)!.push({ isCompleted: m.is_completed });
  }

  return {
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      deadline: g.deadline,
      progressPct: computeGoalProgressPct({
        targetValue: g.target_value,
        currentValue: g.current_value,
        manualProgressPct: g.manual_progress_pct,
        milestones: milestonesByGoal.get(g.id) ?? [],
      }),
    })),
  };
}

async function getMoodSummary(ctx: ToolContext) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: logs } = await ctx.supabase
    .from("mood_logs")
    .select("mood, stress, energy, note, logged_at")
    .eq("user_id", ctx.userId)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false });

  if (!logs || logs.length === 0) return { hasData: false };

  const avg = (values: (number | null)[]) => {
    const nums = values.filter((v): v is number => v !== null);
    return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
  };

  const withNote = logs.find((l) => l.note);

  return {
    hasData: true,
    checkIns: logs.length,
    avgMood: avg(logs.map((l) => l.mood)),
    avgStress: avg(logs.map((l) => l.stress)),
    avgEnergy: avg(logs.map((l) => l.energy)),
    mostRecentNote: withNote?.note ?? null,
  };
}

async function getFinanceSummary(ctx: ToolContext) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ data: transactions }, { data: budgets }, { data: subscriptions }, { data: settings }] =
    await Promise.all([
      ctx.supabase
        .from("transactions")
        .select("type, amount, category, occurred_at")
        .eq("user_id", ctx.userId)
        .gte("occurred_at", monthStart.toISOString()),
      ctx.supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", ctx.userId),
      ctx.supabase
        .from("finance_subscriptions")
        .select("name, amount, next_billing_date")
        .eq("user_id", ctx.userId)
        .eq("is_active", true)
        .not("next_billing_date", "is", null)
        .lte("next_billing_date", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
      ctx.supabase.from("finance_settings").select("currency").eq("user_id", ctx.userId).maybeSingle(),
    ]);

  const records = (transactions ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    occurredAt: t.occurred_at,
  }));
  const cashFlow = computeCashFlow(records);
  const spendingByCategory = computeSpendingByCategory(records);
  const budgetUsage = computeBudgetUsage(
    (budgets ?? []).map((b) => ({ category: b.category, monthlyLimit: b.monthly_limit })),
    spendingByCategory,
  );

  return {
    currency: settings?.currency ?? "EUR",
    cashFlow,
    budgetUsage,
    subscriptionsDueSoon: subscriptions ?? [],
  };
}

async function getNutritionSummary(ctx: ToolContext) {
  const { start, end } = getTodayRangeUtc(ctx.timeZone);

  const [{ data: logs }, { data: settings }] = await Promise.all([
    ctx.supabase
      .from("food_logs")
      .select("calories, protein_g, fat_g, carbs_g")
      .eq("user_id", ctx.userId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString()),
    ctx.supabase.from("nutrition_settings").select("daily_calorie_goal").eq("user_id", ctx.userId).maybeSingle(),
  ]);

  const totals = (logs ?? []).reduce(
    (sum, l) => ({
      calories: sum.calories + l.calories,
      proteinG: sum.proteinG + l.protein_g,
      fatG: sum.fatG + l.fat_g,
      carbsG: sum.carbsG + l.carbs_g,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  const goal = settings?.daily_calorie_goal ?? 2000;

  return { ...totals, calorieGoal: goal, caloriesRemaining: Math.max(0, goal - totals.calories) };
}

async function getWeather(ctx: ToolContext) {
  const { data: settings } = await ctx.supabase
    .from("user_settings")
    .select("default_lat, default_lng")
    .eq("user_id", ctx.userId)
    .single();

  if (!settings?.default_lat || !settings?.default_lng) {
    return { error: "No default location set" };
  }

  try {
    return await getCurrentWeather({ lat: settings.default_lat, lng: settings.default_lng });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Weather lookup failed" };
  }
}

async function searchMemory(ctx: ToolContext, args: { query: string }) {
  try {
    const embedding = await embedText(args.query);
    const { data, error } = await ctx.supabase.rpc("match_memories", {
      query_embedding: embedding,
      match_user_id: ctx.userId,
      match_count: 8,
    });
    if (error) return { error: error.message };
    return {
      memories: (data ?? []).map((m) => ({
        title: m.title,
        content: m.content,
        category: m.category,
        occurredAt: m.occurred_at,
      })),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Memory search failed" };
  }
}

async function logMood(ctx: ToolContext, args: { mood: number; note: string | null }) {
  const { error } = await ctx.supabase.from("mood_logs").insert({
    user_id: ctx.userId,
    mood: args.mood,
    note: args.note ?? null,
    logged_for_date: getTodayKey(ctx.timeZone),
  });
  return error ? { error: error.message } : { success: true };
}

export async function executeTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_schedule":
      return getSchedule(ctx, args as { day?: "today" | "tomorrow" });
    case "get_free_slots":
      return getFreeSlots(ctx, args as { day?: "today" | "tomorrow" });
    case "add_task":
      return addTask(
        ctx,
        args as {
          title: string;
          type: string;
          durationMinutes: number;
          startTime: string | null;
          dueAt: string | null;
          priority: number;
        },
      );
    case "mark_complete":
      return markComplete(ctx, args as { itemId: string });
    case "delete_task":
      return deleteTask(ctx, args as { itemId: string });
    case "replan_day":
      return replanDay(ctx, args as { fromTime: string | null });
    case "get_goals":
      return getGoals(ctx);
    case "get_mood_summary":
      return getMoodSummary(ctx);
    case "get_finance_summary":
      return getFinanceSummary(ctx);
    case "get_nutrition_summary":
      return getNutritionSummary(ctx);
    case "get_weather":
      return getWeather(ctx);
    case "search_memory":
      return searchMemory(ctx, args as { query: string });
    case "log_mood":
      return logMood(ctx, args as { mood: number; note: string | null });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
