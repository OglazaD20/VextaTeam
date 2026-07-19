import { addDays } from "date-fns";

import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { fetchCalendarEvents, refreshAccessToken, type GoogleCalendarEvent } from "./google";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function eventTimes(event: GoogleCalendarEvent): { start: Date; end: Date } | null {
  const startIso = event.start.dateTime ?? event.start.date;
  const endIso = event.end.dateTime ?? event.end.date;
  if (!startIso || !endIso) return null;
  return { start: new Date(startIso), end: new Date(endIso) };
}

export async function syncGoogleCalendar(
  supabase: SupabaseServerClient,
  connection: Tables<"calendar_connections">,
): Promise<{ synced: number; error?: string }> {
  if (!connection.refresh_token_encrypted) {
    return { synced: 0, error: "No refresh token stored for this connection" };
  }

  let accessToken: string;
  try {
    const refreshToken = decryptSecret(connection.refresh_token_encrypted);
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;

    await supabase
      .from("calendar_connections")
      .update({
        access_token_encrypted: encryptSecret(accessToken),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("id", connection.id);
  } catch (error) {
    await supabase
      .from("calendar_connections")
      .update({ sync_status: "error" })
      .eq("id", connection.id);
    return { synced: 0, error: error instanceof Error ? error.message : "Token refresh failed" };
  }

  const timeMin = new Date();
  const timeMax = addDays(timeMin, 14);

  let events: GoogleCalendarEvent[];
  try {
    events = await fetchCalendarEvents(accessToken, timeMin.toISOString(), timeMax.toISOString());
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
      const times = eventTimes(event);

      const { data: existing } = await supabase
        .from("schedule_items")
        .select("id")
        .eq("user_id", connection.user_id)
        .eq("source", "google")
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

      if (!times) return;

      const row = {
        user_id: connection.user_id,
        title: event.summary || "(No title)",
        type: "meeting" as const,
        is_fixed: true,
        location: event.location ?? null,
        scheduled_start: times.start.toISOString(),
        scheduled_end: times.end.toISOString(),
        source: "google" as const,
        external_event_id: event.id,
        deleted_at: null,
      };

      if (existing) {
        await supabase.from("schedule_items").update(row).eq("id", existing.id);
      } else {
        await supabase.from("schedule_items").insert(row);
      }
      synced += 1;
    }),
  );

  await supabase
    .from("calendar_connections")
    .update({ sync_status: "active", last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return { synced };
}
