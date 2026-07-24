import { awardXp } from "@/lib/gamification/award";
import { recordMemory } from "@/lib/memory/upsert";
import { sendPushToUser } from "@/lib/notifications/push";
import type { createClient } from "@/lib/supabase/server";
import type { AutomationAction } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface ActionExecutionResult {
  action: AutomationAction["type"];
  ok: boolean;
  detail?: string;
}

/**
 * Every action here performs a real, already-existing mutation (the same
 * ones a user could trigger by hand) — nothing is invented or simulated.
 * Each is wrapped so one action failing doesn't stop the rest of an
 * automation's action list from running.
 */
export async function executeAction(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
  action: AutomationAction,
): Promise<ActionExecutionResult> {
  try {
    switch (action.type) {
      case "create_task": {
        const scheduledStart =
          action.inMinutes !== undefined ? new Date(Date.now() + action.inMinutes * 60_000) : null;
        const scheduledEnd =
          scheduledStart && action.estimatedDurationMinutes
            ? new Date(scheduledStart.getTime() + action.estimatedDurationMinutes * 60_000)
            : null;

        const { error } = await supabase.from("schedule_items").insert({
          user_id: userId,
          type: "task",
          title: action.title,
          status: "planned",
          estimated_duration_minutes: action.estimatedDurationMinutes ?? null,
          scheduled_start: scheduledStart?.toISOString() ?? null,
          scheduled_end: scheduledEnd?.toISOString() ?? null,
          is_fixed: Boolean(scheduledStart),
          source: "ai_suggested",
        });
        if (error) return { action: action.type, ok: false, detail: error.message };
        return { action: action.type, ok: true };
      }

      case "send_notification": {
        await sendPushToUser(supabase, userId, timeZone, { title: action.title, body: action.body });
        return { action: action.type, ok: true };
      }

      case "reschedule_matching_items": {
        const now = new Date();
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);

        let query = supabase
          .from("schedule_items")
          .select("id, scheduled_start, scheduled_end")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .neq("status", "completed")
          .gte("scheduled_start", dayStart.toISOString())
          .lte("scheduled_start", dayEnd.toISOString());
        if (action.category) query = query.eq("category", action.category);

        const { data: matches, error: selectError } = await query;
        if (selectError) return { action: action.type, ok: false, detail: selectError.message };

        for (const item of matches ?? []) {
          if (!item.scheduled_start) continue;
          const newStart = new Date(new Date(item.scheduled_start).getTime() + action.shiftMinutes * 60_000);
          const newEnd = item.scheduled_end
            ? new Date(new Date(item.scheduled_end).getTime() + action.shiftMinutes * 60_000)
            : null;
          await supabase
            .from("schedule_items")
            .update({ scheduled_start: newStart.toISOString(), scheduled_end: newEnd?.toISOString() ?? null })
            .eq("id", item.id);
        }
        return { action: action.type, ok: true, detail: `${matches?.length ?? 0} item(s) rescheduled` };
      }

      case "award_bonus_xp": {
        await awardXp(supabase, userId, "automation_bonus", null, action.xp);
        return { action: action.type, ok: true };
      }

      case "log_note": {
        await recordMemory(supabase, {
          userId,
          sourceType: "note",
          sourceId: crypto.randomUUID(),
          title: "Automation note",
          content: action.note,
          category: "lifestyle",
        });
        return { action: action.type, ok: true };
      }
    }
  } catch (error) {
    return { action: action.type, ok: false, detail: error instanceof Error ? error.message : "Action failed" };
  }
}
