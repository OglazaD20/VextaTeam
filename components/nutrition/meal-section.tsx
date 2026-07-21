"use client";

import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteFoodLog } from "@/app/(app)/nutrition/actions";
import { FoodSearchDialog } from "@/components/nutrition/food-search-dialog";
import type { MealType } from "@/types/database";

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drinks",
};

export interface FoodLogEntry {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  quantity: number;
}

export function MealSection({
  mealType,
  entries,
}: {
  mealType: MealType;
  entries: FoodLogEntry[];
}) {
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  async function handleDelete(id: string) {
    const result = await deleteFoodLog(id);
    if (result.error) {
      toast.error("Couldn't remove that entry", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{MEAL_LABEL[mealType]}</h3>
          {totalCalories > 0 && (
            <span className="text-xs text-muted-foreground">{Math.round(totalCalories)} cal</span>
          )}
        </div>
        <FoodSearchDialog mealType={mealType} />
      </div>

      {entries.length > 0 && (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-accent/50"
            >
              <span className="truncate">
                {entry.name}
                {entry.quantity !== 1 && (
                  <span className="text-muted-foreground"> ×{entry.quantity}</span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{Math.round(entry.calories)} cal</span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="Remove"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
