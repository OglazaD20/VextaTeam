import type { Metadata } from "next";

import { getSavedActivities } from "@/app/(app)/discover/actions";
import { DiscoverClient } from "@/components/discover/discover-client";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Discover — LifeFlow" };

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const savedActivities = await getSavedActivities();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">What should I do?</h1>
        <p className="text-sm text-muted-foreground">
          Find something to do nearby, matched to your time, budget, and the weather.
        </p>
      </div>
      <DiscoverClient
        eventsAvailable={Boolean(env.TICKETMASTER_API_KEY)}
        initialSavedActivities={savedActivities}
      />
    </div>
  );
}
