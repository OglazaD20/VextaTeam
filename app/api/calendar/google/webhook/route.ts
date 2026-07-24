import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { syncGoogleCalendar } from "@/lib/calendar/sync";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Google Calendar push notification receiver. Google POSTs here (no body,
 * just headers) whenever the watched calendar changes — no payload, no
 * shared-secret signature (that's Google's actual documented model for
 * this API, not a shortcut taken here); the channel/resource IDs we
 * registered are the only correlation we get. We look up which connection
 * owns that channel and trigger an incremental pull sync for it.
 */
export async function POST(request: Request) {
  const channelId = request.headers.get("X-Goog-Channel-ID");
  const resourceId = request.headers.get("X-Goog-Resource-ID");
  const resourceState = request.headers.get("X-Goog-Resource-State");

  if (!channelId || !resourceId) {
    return NextResponse.json({ ok: true });
  }

  // "sync" is the initial handshake message when a channel is created — no
  // actual change to react to.
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = createServiceClient();
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("channel_id", channelId)
      .eq("channel_resource_id", resourceId)
      .maybeSingle();

    if (connection) {
      await syncGoogleCalendar(supabase, connection);
      revalidatePath("/today");
      revalidatePath("/calendar");
      revalidatePath("/calendar/day/[date]", "page");
    }
  } catch {
    // Google expects a fast 200 regardless — a missed webhook self-heals on
    // the next manual/opportunistic sync.
  }

  return NextResponse.json({ ok: true });
}
