"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { updateFoodLog } from "@/app/(app)/nutrition/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MealType } from "@/types/database";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drinks" },
];

export function FoodLogEditDialog({
  open,
  onOpenChange,
  logId,
  name,
  initialQuantity,
  initialMealType,
  initialNotes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  name: string;
  initialQuantity: number;
  initialMealType: MealType;
  initialNotes: string | null;
}) {
  const [quantity, setQuantity] = React.useState(String(initialQuantity));
  const [mealType, setMealType] = React.useState<MealType>(initialMealType);
  const [notes, setNotes] = React.useState(initialNotes ?? "");
  const [isPending, startTransition] = React.useTransition();
  const [wasOpen, setWasOpen] = React.useState(open);

  if (open && !wasOpen) {
    setWasOpen(true);
    setQuantity(String(initialQuantity));
    setMealType(initialMealType);
    setNotes(initialNotes ?? "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("quantity", quantity);
    formData.set("mealType", mealType);
    formData.set("notes", notes);

    startTransition(async () => {
      const result = await updateFoodLog(logId, formData);
      if (result.error) {
        toast.error("Couldn't update that entry", { description: result.error });
        return;
      }
      toast.success("Updated");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fle-quantity">Servings</Label>
              <Input
                id="fle-quantity"
                type="number"
                min={0.1}
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fle-meal">Meal</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger id="fle-meal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fle-notes">Notes (optional)</Label>
            <Input
              id="fle-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra sauce, no onions…"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
