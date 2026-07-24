"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { createHabit, updateHabit } from "@/app/(app)/habits/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { HABIT_CATEGORY_ICON, HABIT_CATEGORY_LABEL } from "@/lib/habits/category-style";
import type { HabitCategory, Tables } from "@/types/database";

const CATEGORIES = Object.keys(HABIT_CATEGORY_LABEL) as HabitCategory[];

export function HabitEditorDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Tables<"habits"> | null;
}) {
  const isEditMode = !!habit;
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [wasOpen, setWasOpen] = React.useState(open);

  const [name, setName] = React.useState(habit?.name ?? "");
  const [category, setCategory] = React.useState<HabitCategory>(habit?.category ?? "custom");
  const [cadence, setCadence] = React.useState<string>(habit?.cadence ?? "daily");
  const [targetValue, setTargetValue] = React.useState(habit?.target_value?.toString() ?? "");
  const [targetUnit, setTargetUnit] = React.useState(habit?.target_unit ?? "");
  const [preferredTime, setPreferredTime] = React.useState(habit?.preferred_time ?? "");
  const [reminderEnabled, setReminderEnabled] = React.useState(habit?.reminder_enabled ?? false);

  // Reset fields whenever the dialog transitions to open, without an effect.
  if (open && !wasOpen) {
    setWasOpen(true);
    setError(null);
    setName(habit?.name ?? "");
    setCategory(habit?.category ?? "custom");
    setCadence(habit?.cadence ?? "daily");
    setTargetValue(habit?.target_value?.toString() ?? "");
    setTargetUnit(habit?.target_unit ?? "");
    setPreferredTime(habit?.preferred_time ?? "");
    setReminderEnabled(habit?.reminder_enabled ?? false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("reminderEnabled", reminderEnabled ? "true" : "false");

    startTransition(async () => {
      const result = isEditMode
        ? await updateHabit(habit.id, data)
        : await createHabit(data);

      if (result.error) {
        setError(result.error);
        toast.error(isEditMode ? "Couldn't update that habit" : "Couldn't add that habit", {
          description: result.error,
        });
        return;
      }
      toast.success(isEditMode ? "Habit updated" : "Habit added");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit habit" : "New habit"}</DialogTitle>
          <DialogDescription>
            LifeFlow tracks streaks and flags skipped days automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Drink water"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" value={category} onValueChange={(v) => setCategory(v as HabitCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {HABIT_CATEGORY_ICON[c]} {HABIT_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cadence">Frequency</Label>
              <Select name="cadence" value={cadence} onValueChange={setCadence}>
                <SelectTrigger id="cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetValue">Target (optional)</Label>
              <Input
                id="targetValue"
                name="targetValue"
                type="number"
                min={0}
                step="any"
                placeholder="8"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetUnit">Unit</Label>
              <Input
                id="targetUnit"
                name="targetUnit"
                placeholder="glasses"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredTime">Preferred time (optional)</Label>
            <Input
              id="preferredTime"
              name="preferredTime"
              type="time"
              value={preferredTime ?? ""}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Reminders</p>
              <p className="text-xs text-muted-foreground">Nudge me if I haven&apos;t logged this yet</p>
            </div>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              {isEditMode ? "Save changes" : "Add habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
