"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { logWeight } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WeightLogForm({ todayKey, latestKg }: { todayKey: string; latestKg: number | null }) {
  const [value, setValue] = React.useState(latestKg?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value) return;
    const formData = new FormData();
    formData.set("date", todayKey);
    formData.set("weightKg", value);
    startTransition(async () => {
      const result = await logWeight(formData);
      if (result.error) {
        toast.error("Couldn't log weight", { description: result.error });
      } else {
        toast.success("Weight logged");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="weight-kg" className="text-xs text-muted-foreground">
          Today&apos;s weight (kg)
        </label>
        <Input
          id="weight-kg"
          type="number"
          min={0}
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending || !value}>
        {isPending && <Loader2Icon className="animate-spin" />}
        Log
      </Button>
    </form>
  );
}
