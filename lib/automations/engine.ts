import { getCurrentWeather } from "@/lib/activities/weather-client";
import { computeBudgetUsage, computeSpendingByCategory } from "@/lib/finance/calculations";
import { getTodayKey } from "@/lib/habits/today-key";
import type { createClient } from "@/lib/supabase/server";
import type { createServiceClient } from "@/lib/supabase/service";
import { evaluateConditionGroups, type AutomationContext } from "./conditions";
import { executeAction } from "./actions";
import type {
  AutomationAction,
  AutomationEvent,
  AutomationTrigger,
  ConditionGroups,
  ScheduleTrigger,
} from "./types";

type UserClient = Awaited<ReturnType<typeof createClient>>;
type ServiceClient = ReturnType<typeof createServiceClient>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the user-session and service-role Supabase clients are structurally identical for the query shapes used here
type AnyClient = any;

interface AutomationRow {
  id: string;
  user_id: string;
  name: string;
  trigger: AutomationTrigger;
  condition_groups: ConditionGroups;
  actions: AutomationAction[];
  last_fired_date?: string | null;
}

function localDayOfWeekAndMinutes(now: Date, timeZone: string): { dayOfWeek: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { dayOfWeek: WEEKDAYS.indexOf(weekdayShort), minutes: hour * 60 + minute };
}

function conditionGroupsReference(groups: ConditionGroups, type: string): boolean {
  return groups.some((group) => group.some((c) => c.type === type));
}

/** Best-effort weather/budget enrichment — only fetched when an automation's own conditions actually reference them, and any failure just leaves that slice of context unset (those conditions then evaluate false rather than blocking the whole automation). */
async function enrichContext(
  supabase: AnyClient,
  userId: string,
  groups: ConditionGroups,
  base: AutomationContext,
): Promise<AutomationContext> {
  const ctx = { ...base };

  if (conditionGroupsReference(groups, "weather_is_raining")) {
    try {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("default_lat, default_lng")
        .eq("user_id", userId)
        .maybeSingle();
      if (settings?.default_lat != null && settings?.default_lng != null) {
        const weather = await getCurrentWeather({ lat: settings.default_lat, lng: settings.default_lng });
        ctx.weather = { isRaining: weather.isRaining };
      }
    } catch {
      // No weather signal available — weather_is_raining conditions just won't match.
    }
  }

  if (conditionGroupsReference(groups, "budget_category_over_pct")) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [{ data: transactions }, { data: budgets }] = await Promise.all([
        supabase
          .from("transactions")
          .select("type, amount, category")
          .eq("user_id", userId)
          .gte("occurred_at", monthStart.toISOString()),
        supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", userId),
      ]);
      const spendingByCategory = computeSpendingByCategory(
        (transactions ?? []).map((t: { type: "income" | "expense"; amount: number; category: string }) => ({
          type: t.type,
          amount: t.amount,
          category: t.category,
        })),
      );
      const usage = computeBudgetUsage(
        (budgets ?? []).map((b: { category: string; monthly_limit: number }) => ({
          category: b.category,
          monthlyLimit: b.monthly_limit,
        })),
        spendingByCategory,
      );
      ctx.budgetUsageByCategory = Object.fromEntries(usage.map((u) => [u.category, u.pctUsed]));
    } catch {
      // No budget signal available — budget_category_over_pct conditions just won't match.
    }
  }

  return ctx;
}

async function runOne(
  supabase: AnyClient,
  automation: AutomationRow,
  timeZone: string,
  baseCtx: AutomationContext,
): Promise<void> {
  const ctx = await enrichContext(supabase, automation.user_id, automation.condition_groups, baseCtx);
  const matched = evaluateConditionGroups(automation.condition_groups, ctx);

  if (!matched) {
    await supabase
      .from("automation_runs")
      .insert({ automation_id: automation.id, user_id: automation.user_id, status: "skipped", actions_taken: [] });
    return;
  }

  const results = [];
  for (const action of automation.actions) {
    results.push(await executeAction(supabase, automation.user_id, timeZone, action));
  }
  const anyFailed = results.some((r) => !r.ok);

  await supabase.from("automations").update({ last_run_at: new Date().toISOString() }).eq("id", automation.id);
  await supabase.from("automation_runs").insert({
    automation_id: automation.id,
    user_id: automation.user_id,
    status: anyFailed ? "error" : "matched",
    actions_taken: results,
    error_message: anyFailed ? results.find((r) => !r.ok)?.detail ?? null : null,
  });
}

/**
 * Fires event-triggered automations for one user, right after the real
 * event they're watching for has genuinely happened — called inline from
 * the existing server action that performed it (task completion, habit
 * logging, etc.), using that same request's own user-scoped Supabase
 * client. Never throws: an automation failing must never break the
 * primary action that triggered it.
 */
export async function runEventAutomations(
  supabase: UserClient,
  userId: string,
  timeZone: string,
  event: AutomationEvent,
  contextExtra: Partial<AutomationContext> = {},
): Promise<void> {
  try {
    const { data: automations } = await supabase
      .from("automations")
      .select("id, user_id, name, trigger, condition_groups, actions")
      .eq("user_id", userId)
      .eq("enabled", true);

    const matching = (automations ?? []).filter((a) => {
      const trigger = a.trigger as unknown as AutomationTrigger;
      return trigger.type === "event" && trigger.event === event;
    }) as unknown as AutomationRow[];

    if (matching.length === 0) return;

    const now = new Date();
    const { dayOfWeek, minutes } = localDayOfWeekAndMinutes(now, timeZone);
    const baseCtx: AutomationContext = { dayOfWeek, timeOfDayMinutes: minutes, ...contextExtra };

    for (const automation of matching) {
      await runOne(supabase, automation, timeZone, baseCtx);
    }
  } catch {
    // Best-effort — see doc comment.
  }
}

/**
 * Called once a day by the Vercel Cron endpoint (Hobby-plan projects can't
 * schedule cron more often than daily). Iterates every enabled
 * schedule-triggered automation across all users (via the service-role
 * client — there's no single user session in a cron context), fires the
 * ones whose configured local trigger time has already passed today, and
 * stamps `last_fired_date` so the same automation never fires twice in one
 * day. Because there's only one tick per day, a trigger time can land
 * anywhere from right on time to nearly 24h late depending on when in the
 * day it falls relative to the cron's fixed run time — see vercel.json.
 */
export async function runDueScheduleAutomations(
  supabase: ServiceClient,
): Promise<{ evaluated: number; matched: number }> {
  const { data: automations } = await supabase
    .from("automations")
    .select("id, user_id, name, trigger, condition_groups, actions, last_fired_date")
    .eq("enabled", true);

  const scheduleAutomations = (automations ?? []).filter(
    (a) => (a.trigger as unknown as AutomationTrigger).type === "schedule",
  ) as unknown as AutomationRow[];

  if (scheduleAutomations.length === 0) return { evaluated: 0, matched: 0 };

  const userIds = [...new Set(scheduleAutomations.map((a) => a.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, timezone").in("id", userIds);
  const timeZoneByUser = new Map((profiles ?? []).map((p) => [p.id, p.timezone ?? "UTC"]));

  let matched = 0;
  const now = new Date();

  for (const automation of scheduleAutomations) {
    const timeZone = timeZoneByUser.get(automation.user_id) ?? "UTC";
    const trigger = automation.trigger as unknown as ScheduleTrigger;
    const localDateKey = getTodayKey(timeZone, now);

    if (automation.last_fired_date === localDateKey) continue;

    const [triggerHour, triggerMinute] = trigger.time.split(":").map(Number);
    const triggerMinutes = triggerHour * 60 + triggerMinute;
    const { dayOfWeek, minutes: nowMinutes } = localDayOfWeekAndMinutes(now, timeZone);

    // The cron only ticks once a day (Vercel Hobby plan doesn't allow
    // finer-grained schedules), so there's no tight polling window to check
    // against — fire the first time this daily tick lands at/after the
    // automation's configured local time, and never before it.
    if (nowMinutes < triggerMinutes) continue;
    if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0 && !trigger.daysOfWeek.includes(dayOfWeek)) continue;

    const baseCtx: AutomationContext = { dayOfWeek, timeOfDayMinutes: nowMinutes };
    await runOne(supabase, automation, timeZone, baseCtx);
    await supabase.from("automations").update({ last_fired_date: localDateKey }).eq("id", automation.id);
    matched++;
  }

  return { evaluated: scheduleAutomations.length, matched };
}
