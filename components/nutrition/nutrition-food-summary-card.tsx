"use client";

import * as React from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { logFoodItemsBulk } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NutritionChatSummary } from "@/lib/ai/nutrition-chat-tools";
import { kcalToKj } from "@/lib/nutrition/macros";
import { guessMealType } from "@/lib/nutrition/meal-type";
import type { MealType } from "@/types/database";

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
};

function describeQuantity(item: NutritionChatSummary["items"][number]): string {
  if (item.quantityGrams) return `${item.quantityGrams}g`;
  if (item.quantityServings) return `${item.quantityServings}×`;
  return "1×";
}

export function NutritionFoodSummaryCard({ summary }: { summary: NutritionChatSummary }) {
  const [mealType, setMealType] = React.useState<MealType>(() => guessMealType(new Date().getHours()));
  const [isPending, startTransition] = React.useTransition();
  const [isLogged, setIsLogged] = React.useState(false);

  const loggableItems = summary.items.filter((item) => item.matched && item.macros);

  function handleAdd() {
    startTransition(async () => {
      const result = await logFoodItemsBulk(
        loggableItems.map((item) => ({
          foodId: item.matched!.id,
          quantity: item.servingMultiplier,
          calories: item.macros!.calories,
          proteinG: item.macros!.proteinG,
          fatG: item.macros!.fatG,
          carbsG: item.macros!.carbsG,
          fiberG: item.macros!.fiberG,
          sugarG: item.macros!.sugarG,
          sodiumMg: item.macros!.sodiumMg,
          mealType,
        })),
      );

      if (result.error) {
        toast.error("Couldn't add those to today's meals", { description: result.error });
        return;
      }
      setIsLogged(true);
      toast.success("Added to today's meals");
    });
  }

  return (
    <div className="flex max-w-[85%] flex-col gap-3 self-start rounded-2xl rounded-bl-sm border border-border bg-card p-3.5 text-sm">
      <div className="flex flex-col gap-1.5">
        {summary.items.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {describeQuantity(item)} {item.query}
            </span>
            {item.macros ? (
              <span className="font-medium">{Math.round(item.macros.calories)} kcal</span>
            ) : (
              <span className="text-destructive">not found</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs font-medium text-muted-foreground">Total</span>
        <span className="text-sm font-semibold">
          {Math.round(summary.totals.calories)} kcal · {kcalToKj(summary.totals.calories)} kJ
        </span>
      </div>
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        <span>{summary.totals.proteinG}g protein</span>
        <span>{summary.totals.carbsG}g carbs</span>
        <span>{summary.totals.fatG}g fat</span>
      </div>

      {loggableItems.length > 0 &&
        (isLogged ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckIcon className="size-3.5" /> Added to today&apos;s meals
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEAL_TYPE_LABEL) as MealType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {MEAL_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Add to today&apos;s meals
            </Button>
          </div>
        ))}
    </div>
  );
}
