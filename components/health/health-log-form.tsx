"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { logHealthMetrics } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database";

export function HealthLogForm({
  todayKey,
  existing,
}: {
  todayKey: string;
  existing: Tables<"health_metrics"> | null;
}) {
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("date", todayKey);

    startTransition(async () => {
      const result = await logHealthMetrics(formData);
      if (result.error) {
        toast.error("Couldn't save today's metrics", { description: result.error });
        return;
      }
      toast.success("Saved");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-sleep-hours">Sleep (hrs)</Label>
          <Input
            id="hm-sleep-hours"
            name="sleepHours"
            type="number"
            min={0}
            max={24}
            step="0.1"
            defaultValue={existing?.sleep_hours ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-sleep-quality">Sleep quality (1-5)</Label>
          <Input
            id="hm-sleep-quality"
            name="sleepQuality"
            type="number"
            min={1}
            max={5}
            step="1"
            defaultValue={existing?.sleep_quality ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-bedtime">Bedtime</Label>
          <Input id="hm-bedtime" name="bedtime" type="time" defaultValue={existing?.bedtime?.slice(0, 5) ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-wake-time">Wake time</Label>
          <Input
            id="hm-wake-time"
            name="wakeTime"
            type="time"
            defaultValue={existing?.wake_time?.slice(0, 5) ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-steps">Steps</Label>
          <Input id="hm-steps" name="steps" type="number" min={0} step="1" defaultValue={existing?.steps ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-calories">Calories burned</Label>
          <Input
            id="hm-calories"
            name="caloriesBurned"
            type="number"
            min={0}
            step="1"
            defaultValue={existing?.calories_burned ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-resting-hr">Resting HR (bpm)</Label>
          <Input
            id="hm-resting-hr"
            name="restingHeartRate"
            type="number"
            min={0}
            step="1"
            defaultValue={existing?.resting_heart_rate ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-avg-hr">Avg HR (bpm)</Label>
          <Input
            id="hm-avg-hr"
            name="avgHeartRate"
            type="number"
            min={0}
            step="1"
            defaultValue={existing?.avg_heart_rate ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-active-minutes">Active minutes</Label>
          <Input
            id="hm-active-minutes"
            name="activeMinutes"
            type="number"
            min={0}
            step="1"
            defaultValue={existing?.active_minutes ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-exercise-type">Exercise</Label>
          <Input
            id="hm-exercise-type"
            name="exerciseType"
            placeholder="Running, yoga…"
            defaultValue={existing?.exercise_type ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-exercise-minutes">Exercise minutes</Label>
          <Input
            id="hm-exercise-minutes"
            name="exerciseMinutes"
            type="number"
            min={0}
            step="1"
            defaultValue={existing?.exercise_minutes ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hm-distance">Distance (km)</Label>
          <Input
            id="hm-distance"
            name="distanceKm"
            type="number"
            min={0}
            step="0.1"
            defaultValue={existing?.distance_km ?? ""}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending && <Loader2Icon className="animate-spin" />}
        Save today&apos;s metrics
      </Button>
    </form>
  );
}
