import type { Metadata } from "next";
import { CalendarIcon, SlidersHorizontalIcon, UserIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarConnections } from "@/components/settings/calendar-connections";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings — LifeFlow" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: connections }, { data: settings }] = user
    ? await Promise.all([
        supabase.from("calendar_connections").select("*").eq("user_id", user.id),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ])
    : [{ data: [] }, { data: null }];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, integrations, and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4" /> Account
          </CardTitle>
          <CardDescription>Your profile details.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4" /> Calendars
          </CardTitle>
          <CardDescription>
            Google Calendar events sync in as fixed anchors on your timeline.
            Outlook and Apple Calendar are planned for a later milestone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarConnections connections={connections ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontalIcon className="size-4" /> Preferences
          </CardTitle>
          <CardDescription>
            Working hours, chronotype, and notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            wakeTime={settings?.wake_time ?? "07:00"}
            sleepTime={settings?.sleep_time ?? "23:00"}
            chronotype={settings?.chronotype ?? "flexible"}
            defaultTaskBufferMinutes={settings?.default_task_buffer_minutes ?? 10}
            focusBlockMinutes={settings?.focus_block_minutes ?? 50}
            breakMinutes={settings?.break_minutes ?? 10}
            lat={settings?.default_lat ?? null}
            lng={settings?.default_lng ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
