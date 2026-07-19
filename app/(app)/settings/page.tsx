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

export const metadata: Metadata = { title: "Settings — LifeFlow" };

export default function SettingsPage() {
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
            Connect Google, Outlook, or Apple Calendar for two-way sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No calendars connected yet — this arrives with the Google Calendar
          sync milestone.
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
        <CardContent className="text-sm text-muted-foreground">
          Preference controls arrive once onboarding is built.
        </CardContent>
      </Card>
    </div>
  );
}
