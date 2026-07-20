"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createScheduleItemSchema,
  updateScheduleItemSchema,
  type CreateScheduleItemInput,
} from "./schema";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

function revalidateSchedule() {
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/calendar/day/[date]", "page");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

function readTaskFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    location: formData.get("location"),
    category: formData.get("category"),
    notes: formData.get("notes"),
    isFixed: formData.get("isFixed") === "true",
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formData.get("scheduledEnd"),
    estimatedDurationMinutes: formData.get("estimatedDurationMinutes"),
    dueAt: formData.get("dueAt"),
    recurrenceRule: formData.get("recurrenceRule"),
  };
}

function taskFieldsToRow(fields: Partial<CreateScheduleItemInput>) {
  return {
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.type !== undefined && { type: fields.type }),
    ...(fields.priority !== undefined && { priority: fields.priority }),
    ...(fields.isFixed !== undefined && { is_fixed: fields.isFixed }),
    ...(fields.location !== undefined && { location: fields.location || null }),
    ...(fields.category !== undefined && { category: fields.category || null }),
    ...(fields.notes !== undefined && { notes: fields.notes || null }),
    ...(fields.scheduledStart !== undefined && {
      scheduled_start: fields.scheduledStart ?? null,
    }),
    ...(fields.scheduledEnd !== undefined && { scheduled_end: fields.scheduledEnd ?? null }),
    ...(fields.dueAt !== undefined && { due_at: fields.dueAt ?? null }),
    ...(fields.estimatedDurationMinutes !== undefined && {
      estimated_duration_minutes: fields.estimatedDurationMinutes ?? null,
    }),
    ...(fields.recurrenceRule !== undefined && {
      recurrence_rule: fields.recurrenceRule ?? null,
    }),
  };
}

async function syncItemTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
  tagNamesRaw: FormDataEntryValue | null,
) {
  if (tagNamesRaw === null) return; // field omitted entirely: leave tags untouched

  let tagNames: string[] = [];
  try {
    tagNames = JSON.parse(String(tagNamesRaw));
  } catch {
    return;
  }
  const cleanNames = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))].slice(0, 20);

  await supabase.from("schedule_item_tags").delete().eq("schedule_item_id", itemId);
  if (cleanNames.length === 0) return;

  const { data: existingTags } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", userId)
    .in("name", cleanNames);

  const existingNames = new Set((existingTags ?? []).map((t) => t.name));
  const newNames = cleanNames.filter((n) => !existingNames.has(n));

  let tagIds = (existingTags ?? []).map((t) => t.id);

  if (newNames.length > 0) {
    const { data: inserted } = await supabase
      .from("tags")
      .insert(newNames.map((name) => ({ user_id: userId, name })))
      .select("id");
    tagIds = [...tagIds, ...(inserted ?? []).map((t) => t.id)];
  }

  if (tagIds.length > 0) {
    await supabase
      .from("schedule_item_tags")
      .insert(tagIds.map((tag_id) => ({ schedule_item_id: itemId, tag_id })));
  }
}

export async function createScheduleItem(formData: FormData): Promise<ActionResult> {
  const parsed = createScheduleItemSchema.safeParse(readTaskFormData(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("schedule_items")
    .insert({
      user_id: user.id,
      source: "lifeflow",
      title: parsed.data.title,
      type: parsed.data.type,
      priority: parsed.data.priority,
      is_fixed: parsed.data.isFixed,
      location: parsed.data.location || null,
      category: parsed.data.category || null,
      notes: parsed.data.notes || null,
      scheduled_start: parsed.data.scheduledStart ?? null,
      scheduled_end: parsed.data.scheduledEnd ?? null,
      due_at: parsed.data.dueAt ?? null,
      estimated_duration_minutes: parsed.data.estimatedDurationMinutes ?? null,
      recurrence_rule: parsed.data.recurrenceRule ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Couldn't create the task" };
  }

  await syncItemTags(supabase, user.id, data.id, formData.get("tagNames"));

  revalidateSchedule();
  return {};
}

export async function updateScheduleItem(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateScheduleItemSchema.safeParse(readTaskFormData(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update(taskFieldsToRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  await syncItemTags(supabase, user.id, id, formData.get("tagNames"));

  revalidateSchedule();
  return {};
}

export async function duplicateTask(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: original, error: fetchError } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: fetchError?.message ?? "Task not found" };
  }

  const { data: tagLinks } = await supabase
    .from("schedule_item_tags")
    .select("tag_id")
    .eq("schedule_item_id", id);

  const { data: copy, error: insertError } = await supabase
    .from("schedule_items")
    .insert({
      user_id: original.user_id,
      type: original.type,
      title: original.title,
      description: original.description,
      priority: original.priority,
      is_fixed: original.is_fixed,
      estimated_duration_minutes: original.estimated_duration_minutes,
      scheduled_start: original.scheduled_start,
      scheduled_end: original.scheduled_end,
      due_at: original.due_at,
      location: original.location,
      category: original.category,
      notes: original.notes,
      habit_id: original.habit_id,
      status: "planned",
      source: "lifeflow",
    })
    .select("id")
    .single();

  if (insertError || !copy) {
    return { error: insertError?.message ?? "Couldn't duplicate the task" };
  }

  if (tagLinks && tagLinks.length > 0) {
    await supabase
      .from("schedule_item_tags")
      .insert(tagLinks.map((t) => ({ schedule_item_id: copy.id, tag_id: t.tag_id })));
  }

  revalidateSchedule();
  return {};
}

export async function archiveTask(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("schedule_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateSchedule();
  return {};
}

export async function unarchiveTask(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("schedule_items")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateSchedule();
  return {};
}

export async function reorderTasks(orderedIds: string[]): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("schedule_items")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );

  revalidateSchedule();
  return {};
}

export async function moveTaskToDay(
  id: string,
  newScheduledStart: string,
  newScheduledEnd: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update({ scheduled_start: newScheduledStart, scheduled_end: newScheduledEnd })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateSchedule();
  return {};
}

export async function setScheduleItemStatus(
  id: string,
  status: "completed" | "planned" | "skipped" | "cancelled",
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidateSchedule();
  return {};
}

export async function deleteScheduleItem(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidateSchedule();
  return {};
}

export async function getTaskDetails(id: string): Promise<
  ActionResult<{
    tags: string[];
    attachments: {
      id: string;
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
      created_at: string;
      schedule_item_id: string;
      storage_path: string;
      user_id: string;
    }[];
  }>
> {
  const { supabase, user } = await requireUser();

  const [{ data: tagLinks }, { data: attachments }] = await Promise.all([
    supabase.from("schedule_item_tags").select("tag_id").eq("schedule_item_id", id),
    supabase
      .from("task_attachments")
      .select("*")
      .eq("schedule_item_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const tagIds = (tagLinks ?? []).map((link) => link.tag_id);
  let tags: string[] = [];
  if (tagIds.length > 0) {
    const { data: tagRows } = await supabase.from("tags").select("name").in("id", tagIds);
    tags = (tagRows ?? []).map((t) => t.name);
  }

  return { data: { tags, attachments: attachments ?? [] } };
}

export async function getUserTags(): Promise<ActionResult<{ id: string; name: string; color: string }[]>> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", user.id)
    .order("name");

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadTaskAttachment(
  itemId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided" };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "File is larger than 10MB" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${itemId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("task_attachments").insert({
    schedule_item_id: itemId,
    user_id: user.id,
    file_name: file.name,
    storage_path: storagePath,
    file_size_bytes: file.size,
    mime_type: file.type || "application/octet-stream",
  });

  if (insertError) {
    await supabase.storage.from("task-attachments").remove([storagePath]);
    return { error: insertError.message };
  }

  revalidateSchedule();
  return {};
}

export async function deleteTaskAttachment(attachmentId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("user_id", user.id)
    .single();

  if (!attachment) {
    return { error: "Attachment not found" };
  }

  await supabase.storage.from("task-attachments").remove([attachment.storage_path]);

  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateSchedule();
  return {};
}

export async function getAttachmentDownloadUrl(
  attachmentId: string,
): Promise<ActionResult<{ url: string }>> {
  const { supabase, user } = await requireUser();

  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("user_id", user.id)
    .single();

  if (!attachment) {
    return { error: "Attachment not found" };
  }

  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(attachment.storage_path, 60);

  if (error || !data) {
    return { error: error?.message ?? "Couldn't create a download link" };
  }

  return { data: { url: data.signedUrl } };
}
