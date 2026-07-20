import { format } from "date-fns";

import type { createClient } from "@/lib/supabase/server";
import { generateOccurrences } from "./rules";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Fills in any missing concrete instances of a recurring task template,
 * from the template's own start through `throughDate`. Idempotent — safe
 * to call every time a calendar view needs to guarantee coverage for a
 * date range, since existing instances (matched by date) are skipped.
 */
export async function generateRecurringInstances(
  supabase: SupabaseServerClient,
  templateId: string,
  throughDate: Date,
): Promise<number> {
  const { data: template } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template || !template.recurrence_rule || !template.scheduled_start) {
    return 0;
  }

  const anchor = new Date(template.scheduled_start);
  const durationMs = template.scheduled_end
    ? new Date(template.scheduled_end).getTime() - anchor.getTime()
    : (template.estimated_duration_minutes ?? 30) * 60_000;

  const occurrences = generateOccurrences(anchor, template.recurrence_rule, throughDate);

  const { data: existing } = await supabase
    .from("schedule_items")
    .select("scheduled_start")
    .eq("parent_item_id", templateId)
    .is("deleted_at", null);

  const existingDateKeys = new Set(
    (existing ?? []).map((row) => format(new Date(row.scheduled_start!), "yyyy-MM-dd")),
  );

  const missing = occurrences.filter(
    (date) => date.getTime() !== anchor.getTime() && !existingDateKeys.has(format(date, "yyyy-MM-dd")),
  );

  if (missing.length === 0) return 0;

  const rows = missing.map((start) => ({
    user_id: template.user_id,
    type: template.type,
    title: template.title,
    description: template.description,
    notes: template.notes,
    category: template.category,
    priority: template.priority,
    is_fixed: template.is_fixed,
    location: template.location,
    estimated_duration_minutes: template.estimated_duration_minutes,
    scheduled_start: start.toISOString(),
    scheduled_end: new Date(start.getTime() + durationMs).toISOString(),
    source: template.source,
    parent_item_id: templateId,
  }));

  const { error } = await supabase.from("schedule_items").insert(rows);
  if (error) throw new Error(`Failed to generate recurring instances: ${error.message}`);

  return rows.length;
}
