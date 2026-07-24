"use client";

import * as React from "react";
import { Loader2Icon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";

import { updateNutritionGoals } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database";

export function GoalsDialog({ settings }: { settings: Tables<"nutrition_settings"> | null }) {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateNutritionGoals(formData);
      if (result.error) {
        toast.error("Couldn't save goals", { description: result.error });
        return;
      }
      toast.success("Goals updated");
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <SettingsIcon className="size-3.5" /> Goals
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nutrition goals</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dailyCalorieGoal">Calories / day</Label>
              <Input
                id="dailyCalorieGoal"
                name="dailyCalorieGoal"
                type="number"
                min={0}
                defaultValue={settings?.daily_calorie_goal ?? 2000}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="waterGoalMl">Water (ml)</Label>
              <Input
                id="waterGoalMl"
                name="waterGoalMl"
                type="number"
                min={0}
                defaultValue={settings?.water_goal_ml ?? 2000}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proteinGoalG">Protein (g)</Label>
              <Input
                id="proteinGoalG"
                name="proteinGoalG"
                type="number"
                min={0}
                defaultValue={settings?.protein_goal_g ?? 120}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carbsGoalG">Carbs (g)</Label>
              <Input
                id="carbsGoalG"
                name="carbsGoalG"
                type="number"
                min={0}
                defaultValue={settings?.carbs_goal_g ?? 250}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fatGoalG">Fat (g)</Label>
              <Input
                id="fatGoalG"
                name="fatGoalG"
                type="number"
                min={0}
                defaultValue={settings?.fat_goal_g ?? 65}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fiberGoalG">Fiber (g)</Label>
              <Input
                id="fiberGoalG"
                name="fiberGoalG"
                type="number"
                min={0}
                defaultValue={settings?.fiber_goal_g ?? 30}
                required
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="heightCm">Height (cm, optional — for BMI)</Label>
              <Input
                id="heightCm"
                name="heightCm"
                type="number"
                min={0}
                defaultValue={settings?.height_cm ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save goals
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
