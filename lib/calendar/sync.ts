import { addDays } from "date-fns";

import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { resolveConflict } from "./conflict";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  refreshAccessToken,
  updateCalendarEvent,
  watchCalendarEvents,
  type EventWriteInput,
  type GoogleCalendarEvent,
} from "./google";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const WATCH_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000; // renew if expiring within a day

function eventTimes(event: GoogleCalendarEvent): { start: Date; end: Date } | null {
  const startIso = event.start.dateTime ?? event.start.date;
  const endIso = event.end.dateTime ?? event.end.date;
  if (!startIso || !endIso) return null;
  return { start: new Date(startIso), end: new Date(endIso) };
}

async function getFreshAccessToken(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
): Promise<string> {
  if (!connection.refresh_token_encrypted) {
    throw new Error("No refresh token stored for this connection");
  }
  const refreshToken = decryptSecret(connection.refresh_token_encrypted);
  const refreshed = await refreshAccessToken(refreshToken);

  await supabase
    .from("calendar_connections")
    .update({
      access_token_encrypted: encryptSecret(refreshed.access_token),
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.access_token;
}

/** Registers or renews the push-notification channel, opportunistically (no cron needed). */
async function ensureWatchChannel(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
  accessToken: string,
): Promise<void> {
  const webhookBase = process.env.NEXT_PUBLIC_APP_URL;
  if (!webhookBase) return; // Real-time push requires a public webhook URL; polling still works without it.

  const expiresAt = connection.channel_expiration ? new Date(connection.channel_expiration) : null;
  const needsRenewal = !expiresAt || expiresAt.getTime() - Date.now() < WATCH_RENEWAL_WINDOW_MS;
  if (!needsRenewal) return;

  try {
    const channelId = crypto.randomUUID();
    const channel = await watchCalendarEvents(
      accessToken,
      channelId,
      `${webhookBase}/api/calendar/google/webhook`,
    );
    await supabase
      .from("calendar_connections")
      .update({
        channel_id: channel.channelId,
        channel_resource_id: channel.resourceId,
        channel_expiration: channel.expiration,
      })
      .eq("id", connection.id);
  } catch {
    // Real-time push is a nice-to-have — polling/manual sync still works without it.
  }
}

export async function syncGoogleCalendar(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
): Promise<{ synced: number; error?: string }> {
  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, connection);
  } catch (error) {
    await supabase
      .from("calendar_connections")
      .update({ sync_status: "error" })
      .eq("id", connection.id);
    return { synced: 0, error: error instanceof Error ? error.message : "Token refresh failed" };
  }

  let events: GoogleCalendarEvent[];
  let nextSyncToken: string | null;

  try {
    const window = connection.sync_cursor
      ? { syncToken: connection.sync_cursor }
      : { timeMinIso: new Date().toISOString(), timeMaxIso: addDays(new Date(), 14).toISOString() };

    const result = await fetchCalendarEvents(accessToken, window);

    if (result.syncTokenInvalid) {
      // Google expired our sync token — fall back to a full window resync.
      const fullResult = await fetchCalendarEvents(accessToken, {
        timeMinIso: new Date().toISOString(),
        timeMaxIso: addDays(new Date(), 14).toISOString(),
      });
      events = fullResult.events;
      nextSyncToken = fullResult.nextSyncToken;
    } else {
      events = result.events;
      nextSyncToken = result.nextSyncToken;
    }
  } catch (error) {
    await supabase
      .from("calendar_connections")
      .update({ sync_status: "error" })
      .eq("id", connection.id);
    return { synced: 0, error: error instanceof Error ? error.message : "Fetch failed" };
  }

  let synced = 0;

  await Promise.all(
    events.map(async (event) => {
      const { data: existing } = await supabase
        .from("schedule_items")
        .select("id, updated_at, external_updated_at")
        .eq("user_id", connection.user_id)
        .eq("external_event_id", event.id)
        .maybeSingle();

      if (event.status === "cancelled") {
        if (existing) {
          await supabase
            .from("schedule_items")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
        return;
      }

      const times = eventTimes(event);
      if (!times) return;

      if (existing) {
        const resolution = resolveConflict({
          localUpdatedAt: new Date(existing.updated_at),
          externalUpdatedAt: existing.external_updated_at ? new Date(existing.external_updated_at) : null,
          remoteUpdatedAt: new Date(event.updated),
        });

        // Local wins: leave it alone here — the next local write will push
        // this item's current state back to Google.
        if (resolution !== "use_remote") return;

        await supabase
          .from("schedule_items")
          .update({
            title: event.summary || "(No title)",
            location: event.location ?? null,
            scheduled_start: times.start.toISOString(),
            scheduled_end: times.end.toISOString(),
            external_updated_at: event.updated,
            deleted_at: null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("schedule_items").insert({
          user_id: connection.user_id,
          title: event.summary || "(No title)",
          type: "meeting",
          is_fixed: true,
          location: event.location ?? null,
          scheduled_start: times.start.toISOString(),
          scheduled_end: times.end.toISOString(),
          source: "google",
          external_event_id: event.id,
          external_updated_at: event.updated,
          deleted_at: null,
        });
      }
      synced += 1;
    }),
  );

  await supabase
    .from("calendar_connections")
    .update({
      sync_status: "active",
      last_synced_at: new Date().toISOString(),
      sync_cursor: nextSyncToken,
    })
    .eq("id", connection.id);

  await ensureWatchChannel(supabase, connection, accessToken);

  return { synced };
}

/** Pushes a locally-created-or-edited fixed item to Google, linking it if not already. */
export async function pushScheduleItemToGoogle(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
  item: Pick<Tables<"schedule_items">, "id" | "title" | "location" | "scheduled_start" | "scheduled_end" | "external_event_id">,
  timeZone: string,
): Promise<void> {
  if (!item.scheduled_start || !item.scheduled_end) return;

  const accessToken = await getFreshAccessToken(supabase, connection);
  const input: EventWriteInput = {
    title: item.title,
    location: item.location,
    start: new Date(item.scheduled_start),
    end: new Date(item.scheduled_end),
    timeZone,
  };

  const remoteEvent = item.external_event_id
    ? await updateCalendarEvent(accessToken, item.external_event_id, input)
    : await createCalendarEvent(accessToken, input);

  await supabase
    .from("schedule_items")
    .update({
      external_event_id: remoteEvent.id,
      external_updated_at: remoteEvent.updated,
    })
    .eq("id", item.id);
}

export async function deleteScheduleItemFromGoogle(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
  externalEventId: string,
): Promise<void> {
  const accessToken = await getFreshAccessToken(supabase, connection);
  await deleteCalendarEvent(accessToken, externalEventId);
}

async function getActiveGoogleConnection(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Tables<"calendar_connections"> | null> {
  const { data } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("sync_status", "active")
    .maybeSingle();
  return data;
}

/**
 * Best-effort push of a fixed (anchored) schedule item to Google, called
 * from the task actions after create/update. Silently does nothing if the
 * user has no active Google connection, and swallows API errors — a Google
 * hiccup should never block local task management.
 */
export async function pushIfGoogleConnected(
  supabase: SupabaseServerClient,
  userId: string,
  item: Pick<
    Tables<"schedule_items">,
    "id" | "title" | "location" | "scheduled_start" | "scheduled_end" | "external_event_id" | "is_fixed"
  >,
): Promise<void> {
  if (!item.is_fixed || !item.scheduled_start || !item.scheduled_end) return;

  const connection = await getActiveGoogleConnection(supabase, userId);
  if (!connection) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();

  await pushScheduleItemToGoogle(supabase, connection, item, profile?.timezone ?? "UTC").catch(() => {
    // See function doc — best-effort.
  });
}

/** Best-effort delete propagation to Google when a linked item is removed locally. */
export async function deleteIfGoogleConnected(
  supabase: SupabaseServerClient,
  userId: string,
  externalEventId: string | null,
): Promise<void> {
  if (!externalEventId) return;

  const connection = await getActiveGoogleConnection(supabase, userId);
  if (!connection) return;

  await deleteScheduleItemFromGoogle(supabase, connection, externalEventId).catch(() => {
    // Best-effort — see pushIfGoogleConnected.
  });
}
