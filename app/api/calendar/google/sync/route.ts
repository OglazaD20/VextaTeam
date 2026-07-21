import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { syncGoogleCalendar } from "@/lib/calendar/sync";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .eq("sync_status", "active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!connection) {
    return NextResponse.json({ error: "No connected Google Calendar" }, { status: 404 });
  }

  const result = await syncGoogleCalendar(supabase, connection);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  revalidatePath("/today");
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/calendar/day/[date]", "page");
  return NextResponse.json({ synced: result.synced });
}
