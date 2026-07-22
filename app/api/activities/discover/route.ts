import { NextResponse } from "next/server";
import { z } from "zod";

import { discoverActivities } from "@/lib/activities/discover";
import { ACTIVITY_CATEGORIES } from "@/lib/activities/geoapify-client";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";

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

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activity discovery failed" },
      { status: 502 },
    );
  }
}
