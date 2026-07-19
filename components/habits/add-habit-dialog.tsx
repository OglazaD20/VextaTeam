"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createHabit } from "@/app/(app)/habits/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { HABIT_CATEGORY_ICON, HABIT_CATEGORY_LABEL } from "@/lib/habits/category-style";
import type { HabitCategory } from "@/types/database";

const CATEGORIES = Object.keys(HABIT_CATEGORY_LABEL) as HabitCategory[];

export function AddHabitDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await createHabit(data);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that habit", { description: result.error });
        return;
      }
      toast.success("Habit added");
      form.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> New habit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
          <DialogDescription>
            LifeFlow tracks streaks and flags skipped days automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Drink water" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue="custom">
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {HABIT_CATEGORY_ICON[category]} {HABIT_CATEGORY_LABEL[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cadence">Frequency</Label>
              <Select name="cadence" defaultValue="daily">
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
              <Input id="targetValue" name="targetValue" type="number" min={0} step="any" placeholder="8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetUnit">Unit</Label>
              <Input id="targetUnit" name="targetUnit" placeholder="glasses" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredTime">Preferred time (optional)</Label>
            <Input id="preferredTime" name="preferredTime" type="time" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Add habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
