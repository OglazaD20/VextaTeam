"use client";

import * as React from "react";
import { Loader2Icon, MapPinIcon } from "lucide-react";
import { toast } from "sonner";

import { updateUserSettings } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Chronotype } from "@/types/database";

export function PreferencesForm({
  wakeTime,
  sleepTime,
  chronotype,
  defaultTaskBufferMinutes,
  focusBlockMinutes,
  breakMinutes,
  lat,
  lng,
}: {
  wakeTime: string;
  sleepTime: string;
  chronotype: Chronotype;
  defaultTaskBufferMinutes: number;
  focusBlockMinutes: number;
  breakMinutes: number;
  lat: number | null;
  lng: number | null;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [isLocating, setIsLocating] = React.useState(false);
  const [location, setLocation] = React.useState({ lat, lng });

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation isn't available in this browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
        toast.success("Location captured — save to apply it");
      },
      () => {
        toast.error("Location permission denied");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("lat", location.lat != null ? String(location.lat) : "");
    formData.set("lng", location.lng != null ? String(location.lng) : "");

    startTransition(async () => {
      const result = await updateUserSettings(formData);
      if (result.error) {
        toast.error("Couldn't save preferences", { description: result.error });
        return;
      }
      toast.success("Preferences saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wakeTime">Wake time</Label>
          <Input id="wakeTime" name="wakeTime" type="time" defaultValue={wakeTime.slice(0, 5)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sleepTime">Sleep time</Label>
          <Input id="sleepTime" name="sleepTime" type="time" defaultValue={sleepTime.slice(0, 5)} required />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="chronotype">Chronotype</Label>
          <Select name="chronotype" defaultValue={chronotype}>
            <SelectTrigger id="chronotype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="early_bird">Early bird — best mornings</SelectItem>
              <SelectItem value="night_owl">Night owl — best evenings</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The AI planner prioritizes deep-work tasks during your best hours.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="defaultTaskBufferMinutes">Buffer between tasks (min)</Label>
          <Input
            id="defaultTaskBufferMinutes"
            name="defaultTaskBufferMinutes"
            type="number"
            min={0}
            max={120}
            defaultValue={defaultTaskBufferMinutes}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="focusBlockMinutes">Focus block length (min)</Label>
          <Input
            id="focusBlockMinutes"
            name="focusBlockMinutes"
            type="number"
            min={5}
            max={240}
            defaultValue={focusBlockMinutes}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="breakMinutes">Break length (min)</Label>
          <Input
            id="breakMinutes"
            name="breakMinutes"
            type="number"
            min={0}
            max={60}
            defaultValue={breakMinutes}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
        <div>
          <p className="text-sm font-medium">Home location</p>
          <p className="text-xs text-muted-foreground">
            {location.lat != null && location.lng != null
              ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
              : "Not set — enables weather-aware AI planning."}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleUseCurrentLocation} disabled={isLocating}>
          {isLocating ? <Loader2Icon className="animate-spin" /> : <MapPinIcon className="size-3.5" />}
          Use current
        </Button>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending && <Loader2Icon className="animate-spin" />}
        Save preferences
      </Button>
    </form>
  );
}
