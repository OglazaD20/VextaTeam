"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createAndLogFood } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { kcalToKj } from "@/lib/nutrition/macros";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types/database";

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
];

type Basis = "per100g" | "portion";

export function CreateCustomFoodDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [mealType, setMealType] = React.useState<MealType>("snack");
  const [basis, setBasis] = React.useState<Basis>("per100g");
  const [amount, setAmount] = React.useState("100");
  const [calories, setCalories] = React.useState("");
  const [isDetailsOpen, setDetailsOpen] = React.useState(false);

  function switchBasis(next: Basis) {
    setBasis(next);
    setAmount(next === "per100g" ? "100" : "1");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("mealType", mealType);
    formData.set("basis", basis);

    startTransition(async () => {
      const result = await createAndLogFood(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't log that food", { description: result.error });
        return;
      }
      toast.success("Logged — counted toward today's calories");
      (event.target as HTMLFormElement).reset();
      setCalories("");
      setBasis("per100g");
      setAmount("100");
      setDetailsOpen(false);
      setOpen(false);
    });
  }

  const caloriesNum = Number(calories) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Quick add
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add a food</DialogTitle>
          <DialogDescription>
            Enter it your own way — it&apos;s logged as eaten right away and counted toward today.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-name">Name</Label>
            <Input id="cf-name" name="name" placeholder="Grandma's lasagna" required autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-meal">Meal</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger id="cf-meal">
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

          <div className="flex flex-col gap-1.5">
            <Label>Nutrition values are for</Label>
            <div className="flex rounded-lg border border-border p-0.5">
              {(
                [
                  { value: "per100g", label: "100 g" },
                  { value: "portion", label: "1 portion" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => switchBasis(option.value)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                    basis === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-amount">
                {basis === "per100g" ? "Grams eaten" : "Portions eaten"}
              </Label>
              <Input
                id="cf-amount"
                name="amount"
                type="number"
                min={0.1}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-calories">
                Calories {basis === "per100g" ? "/ 100 g" : "/ portion"}
              </Label>
              <Input
                id="cf-calories"
                name="calories"
                type="number"
                min={0}
                step="any"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required
              />
            </div>
          </div>
          {caloriesNum > 0 && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {caloriesNum} kcal · {kcalToKj(caloriesNum)} kJ
            </p>
          )}

          <Collapsible open={isDetailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                More details (optional)
                <ChevronDownIcon
                  className={cn("size-3.5 transition-transform", isDetailsOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-protein">Protein (g)</Label>
                  <Input id="cf-protein" name="proteinG" type="number" min={0} step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-fat">Fat (g)</Label>
                  <Input id="cf-fat" name="fatG" type="number" min={0} step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-carbs">Carbs (g)</Label>
                  <Input id="cf-carbs" name="carbsG" type="number" min={0} step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-fiber">Fiber (g)</Label>
                  <Input id="cf-fiber" name="fiberG" type="number" min={0} step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-sugar">Sugar (g)</Label>
                  <Input id="cf-sugar" name="sugarG" type="number" min={0} step="any" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cf-sodium">Sodium (mg)</Label>
                  <Input id="cf-sodium" name="sodiumMg" type="number" min={0} step="any" />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                  <Label htmlFor="cf-brand">Brand (optional)</Label>
                  <Input id="cf-brand" name="brand" placeholder="Homemade" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Log it
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
