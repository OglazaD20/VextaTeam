"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { revokeGoogleToken, stopWatchChannel } from "@/lib/calendar/google";
import { decryptSecret } from "@/lib/security/encryption";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

export interface ActionResult {
  error?: string;
}

const updateUserSettingsSchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/),
  chronotype: z.enum(["early_bird", "night_owl", "flexible"]),
  defaultTaskBufferMinutes: z.coerce.number().int().min(0).max(120),
  focusBlockMinutes: z.coerce.number().int().min(5).max(240),
  breakMinutes: z.coerce.number().int().min(0).max(60),
  lat: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(-90).max(90).optional(),
  ),
  lng: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(-180).max(180).optional(),
  ),
});

export async function updateUserSettings(formData: FormData): Promise<ActionResult> {
  const parsed = updateUserSettingsSchema.safeParse({
    wakeTime: formData.get("wakeTime"),
    sleepTime: formData.get("sleepTime"),
    chronotype: formData.get("chronotype"),
    defaultTaskBufferMinutes: formData.get("defaultTaskBufferMinutes"),
    focusBlockMinutes: formData.get("focusBlockMinutes"),
    breakMinutes: formData.get("breakMinutes"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("user_settings")
    .update({
      wake_time: data.wakeTime,
      sleep_time: data.sleepTime,
      chronotype: data.chronotype,
      default_task_buffer_minutes: data.defaultTaskBufferMinutes,
      focus_block_minutes: data.focusBlockMinutes,
      break_minutes: data.breakMinutes,
      default_lat: data.lat ?? null,
      default_lng: data.lng ?? null,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function disconnectCalendar(connectionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("access_token_encrypted, channel_id, channel_resource_id")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connection?.access_token_encrypted) {
    const accessToken = decryptSecret(connection.access_token_encrypted);
    if (connection.channel_id && connection.channel_resource_id) {
      await stopWatchChannel(accessToken, connection.channel_id, connection.channel_resource_id);
    }
    await revokeGoogleToken(accessToken);
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return {};
}

const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function subscribeToPush(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult> {
  const parsed = subscribePushSchema.safeParse(subscription);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid subscription" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return {};
}

export async function updateNotificationPrefs(prefs: Record<NotificationType, boolean>): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_settings")
    .update({ notification_prefs: prefs })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

const notificationSettingsSchema = z.object({
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  notificationSound: z.boolean(),
  vibration: z.boolean(),
  reminderFrequency: z.enum(["normal", "reduced", "minimal"]),
});

export async function updateNotificationSettings(input: {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationSound: boolean;
  vibration: boolean;
  reminderFrequency: "normal" | "reduced" | "minimal";
}): Promise<ActionResult> {
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      quiet_hours_start: parsed.data.quietHoursStart,
      quiet_hours_end: parsed.data.quietHoursEnd,
      notification_sound: parsed.data.notificationSound,
      vibration: parsed.data.vibration,
      reminder_frequency: parsed.data.reminderFrequency,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
