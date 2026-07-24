"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { updateNotificationPrefs, updateNotificationSettings } from "@/app/(app)/settings/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_CATEGORIES, isNotificationEnabled, type NotificationPrefs } from "@/lib/notifications/preferences";
import type { NotificationType, ReminderFrequency } from "@/types/database";

const FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  normal: "Normal",
  reduced: "Reduced — fewer repeats",
  minimal: "Minimal — deadlines only",
};

export function NotificationPreferencesForm({
  prefs,
  quietHoursStart,
  quietHoursEnd,
  notificationSound,
  vibration,
  reminderFrequency,
}: {
  prefs: NotificationPrefs;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationSound: boolean;
  vibration: boolean;
  reminderFrequency: ReminderFrequency;
}) {
  const [enabled, setEnabled] = React.useState<Record<NotificationType, boolean>>(() =>
    Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((c) => [c.type, isNotificationEnabled(prefs, c.type)]),
    ) as Record<NotificationType, boolean>,
  );
  const [quietStart, setQuietStart] = React.useState(quietHoursStart?.slice(0, 5) ?? "");
  const [quietEnd, setQuietEnd] = React.useState(quietHoursEnd?.slice(0, 5) ?? "");
  const [sound, setSound] = React.useState(notificationSound);
  const [vibrate, setVibrate] = React.useState(vibration);
  const [frequency, setFrequency] = React.useState<ReminderFrequency>(reminderFrequency);
  const [isPending, startTransition] = React.useTransition();

  function toggleCategory(type: NotificationType, checked: boolean) {
    const next = { ...enabled, [type]: checked };
    setEnabled(next);
    startTransition(async () => {
      const result = await updateNotificationPrefs(next);
      if (result.error) toast.error("Couldn't save that", { description: result.error });
    });
  }

  function saveQuietHoursAndSound() {
    startTransition(async () => {
      const result = await updateNotificationSettings({
        quietHoursStart: quietStart || null,
        quietHoursEnd: quietEnd || null,
        notificationSound: sound,
        vibration: vibrate,
        reminderFrequency: frequency,
      });
      if (result.error) toast.error("Couldn't save that", { description: result.error });
      else toast.success("Saved");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <div key={category.type} className="flex items-start gap-2.5">
            <Checkbox
              id={`notif-${category.type}`}
              checked={enabled[category.type]}
              onCheckedChange={(checked) => toggleCategory(category.type, checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor={`notif-${category.type}`} className="flex-1 font-normal">
              <span className="block text-sm">{category.label}</span>
              <span className="block text-xs text-muted-foreground">{category.description}</span>
            </Label>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quiet-start">Quiet hours start</Label>
            <Input id="quiet-start" type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quiet-end">Quiet hours end</Label>
            <Input id="quiet-end" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notif-sound" className="font-normal">
            Notification sound
          </Label>
          <Switch id="notif-sound" checked={sound} onCheckedChange={setSound} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notif-vibration" className="font-normal">
            Vibration
          </Label>
          <Switch id="notif-vibration" checked={vibrate} onCheckedChange={setVibrate} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notif-frequency">Reminder frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as ReminderFrequency)}>
            <SelectTrigger id="notif-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FREQUENCY_LABEL) as ReminderFrequency[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {FREQUENCY_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={saveQuietHoursAndSound}
          disabled={isPending}
          className="flex w-fit items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {isPending && <Loader2Icon className="size-3 animate-spin" />}
          Save quiet hours & sound
        </button>
      </div>
    </div>
  );
}
