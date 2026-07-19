import { addDays, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

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
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
