import webPush from "web-push";

import { env } from "@/lib/env";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webPush.setVapidDetails("mailto:support@lifeflow.app", env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

function isWithinQuietHours(
  now: Date,
  timeZone: string,
  quietStart: string | null,
  quietEnd: string | null,
): boolean {
  if (!quietStart || !quietEnd) return false;

  const nowMinutes = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  })();

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const startMinutes = toMinutes(quietStart);
  const endMinutes = toMinutes(quietEnd);

  // Quiet hours commonly wrap past midnight (e.g. 22:00–07:00).
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
}

const DEFAULT_VIBRATE_PATTERN = [200, 100, 200];

/**
 * Best-effort: sends a Web Push notification to every subscribed
 * browser/device for a user, respecting their quiet hours. Never throws —
 * a push delivery failure should never break the caller's primary action.
 * Dead subscriptions (expired/unsubscribed — 404/410) are cleaned up.
 */
export async function sendPushToUser(
  supabase: SupabaseServerClient,
  userId: string,
  timeZone: string,
  payload: PushPayload,
): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("quiet_hours_start, quiet_hours_end, vibration")
      .eq("user_id", userId)
      .maybeSingle();

    if (isWithinQuietHours(new Date(), timeZone, settings?.quiet_hours_start ?? null, settings?.quiet_hours_end ?? null)) {
      return;
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const outgoingPayload: PushPayload = {
      ...payload,
      vibrate: (settings?.vibration ?? true) ? (payload.vibrate ?? DEFAULT_VIBRATE_PATTERN) : [],
    };

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(outgoingPayload),
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }),
    );
  } catch {
    // Best-effort — never breaks the caller.
  }
}
