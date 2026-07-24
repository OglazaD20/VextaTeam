import type { Metadata } from "next";
import { BellRingIcon, CalendarIcon, GlobeIcon, SlidersHorizontalIcon, UserIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CalendarConnections } from "@/components/settings/calendar-connections";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { PushNotificationToggle } from "@/components/settings/push-notification-toggle";
import { getDictionary } from "@/lib/i18n/get-locale";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings — LifeFlow" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await getDictionary();

  const [{ data: connections }, { data: settings }] = user
    ? await Promise.all([
        supabase.from("calendar_connections").select("*").eq("user_id", user.id),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ])
    : [{ data: [] }, { data: null }];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4" /> {t.settings.account}
          </CardTitle>
          <CardDescription>{t.settings.accountDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t.settings.appearance}</span>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GlobeIcon className="size-4" /> {t.settings.language}
          </CardTitle>
          <CardDescription>{t.settings.languageDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t.settings.language}</span>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4" /> {t.settings.calendars}
          </CardTitle>
          <CardDescription>{t.settings.calendarsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarConnections connections={connections ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRingIcon className="size-4" /> Notifications
          </CardTitle>
          <CardDescription>Push notifications, categories, and quiet hours.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PushNotificationToggle vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
          <NotificationPreferencesForm
            prefs={settings?.notification_prefs ?? {}}
            quietHoursStart={settings?.quiet_hours_start ?? null}
            quietHoursEnd={settings?.quiet_hours_end ?? null}
            notificationSound={settings?.notification_sound ?? true}
            vibration={settings?.vibration ?? true}
            reminderFrequency={settings?.reminder_frequency ?? "normal"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontalIcon className="size-4" /> {t.settings.preferences}
          </CardTitle>
          <CardDescription>{t.settings.preferencesDescription}</CardDescription>
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
