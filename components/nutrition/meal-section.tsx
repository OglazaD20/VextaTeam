"use client";

import * as React from "react";
import { CopyIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteFoodLog, duplicateFoodLog } from "@/app/(app)/nutrition/actions";
import { FoodLogEditDialog } from "@/components/nutrition/food-log-edit-dialog";
import { FoodSearchDialog } from "@/components/nutrition/food-search-dialog";
import { SaveTemplateDialog } from "@/components/nutrition/save-template-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  foodId: string | null;
  name: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  quantity: number;
  mealType: MealType;
  notes: string | null;
}

function EntryRow({ entry }: { entry: FoodLogEntry }) {
  const [isEditOpen, setEditOpen] = React.useState(false);

  async function handleDelete() {
    const result = await deleteFoodLog(entry.id);
    if (result.error) {
      toast.error("Couldn't remove that entry", { description: result.error });
    }
  }

  async function handleDuplicate() {
    const result = await duplicateFoodLog(entry.id);
    if (result.error) {
      toast.error("Couldn't duplicate that entry", { description: result.error });
    } else {
      toast.success("Duplicated");
    }
  }

  return (
    <div className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-accent/50">
      <span className="truncate">
        {entry.name}
        {entry.quantity !== 1 && <span className="text-muted-foreground"> ×{entry.quantity}</span>}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs text-muted-foreground">{Math.round(entry.calories)} kcal</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More actions"
              className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            >
              <MoreHorizontalIcon className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <CopyIcon /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FoodLogEditDialog
        open={isEditOpen}
        onOpenChange={setEditOpen}
        logId={entry.id}
        name={entry.name}
        initialQuantity={entry.quantity}
        initialMealType={entry.mealType}
        initialNotes={entry.notes}
      />
    </div>
  );
}

export function MealSection({
  mealType,
  entries,
}: {
  mealType: MealType;
  entries: FoodLogEntry[];
}) {
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const templateItems = entries
    .filter((e): e is FoodLogEntry & { foodId: string } => !!e.foodId)
    .map((e) => ({ foodId: e.foodId, quantity: e.quantity }));

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{MEAL_LABEL[mealType]}</h3>
          {totalCalories > 0 && (
            <span className="text-xs text-muted-foreground">{Math.round(totalCalories)} kcal</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SaveTemplateDialog mealType={mealType} items={templateItems} />
          <FoodSearchDialog mealType={mealType} />
        </div>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
