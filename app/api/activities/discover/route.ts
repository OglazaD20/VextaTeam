import { NextResponse } from "next/server";
import { z } from "zod";

import { discoverActivities } from "@/lib/activities/discover";
import { ACTIVITY_CATEGORIES } from "@/lib/activities/geoapify-client";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { isNotificationDueForFrequency, isNotificationEnabled } from "@/lib/notifications/preferences";
import { sendPushToUser } from "@/lib/notifications/push";

const categoryEnum = z.enum(
  Object.keys(ACTIVITY_CATEGORIES) as [keyof typeof ACTIVITY_CATEGORIES],
);

const bodySchema = z.object({
  categories: z.array(categoryEnum).min(1).max(6),
  location: z.object({ lat: z.number(), lng: z.number() }),
  maxDistanceKm: z.number().positive().max(50),
  availableMinutes: z.number().int().positive().max(1440),
  budget: z.enum(["free", "low", "medium", "high"]),
  indoorOutdoor: z.enum(["indoor", "outdoor", "any"]),
  social: z.enum(["solo", "group", "any"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const locale = await getLocale();
    const suggestions = await discoverActivities(parsed.data, locale);

    await supabase.from("activity_suggestions").insert({
      user_id: user.id,
      categories: parsed.data.categories,
      filters: parsed.data,
      results: suggestions as unknown as Record<string, unknown>[],
    });

    // This request is normally answered while the user is watching the
    // Discover page, but the category toggle lets them opt in to a push too
    // (e.g. they navigated away, or installed LifeFlow as a PWA and want a
    // ping when a search they kicked off finishes).
    if (suggestions.length > 0) {
      const { data: notifSettings } = await supabase
        .from("user_settings")
        .select("notification_prefs, reminder_frequency")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
      if (
        isNotificationEnabled(notifSettings?.notification_prefs, "discover_recommendation") &&
        isNotificationDueForFrequency("discover_recommendation", notifSettings?.reminder_frequency)
      ) {
        await sendPushToUser(supabase, user.id, profile?.timezone ?? "UTC", {
          title: "New Discover recommendations",
          body: `Found ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} nearby.`,
        });
      }
    }

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activity discovery failed" },
      { status: 502 },
    );
  }
}
