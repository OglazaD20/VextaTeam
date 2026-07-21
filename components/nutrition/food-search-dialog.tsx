"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { logFood } from "@/app/(app)/nutrition/actions";
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
import type { MealType } from "@/types/database";

interface FoodResult {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  serving_size: number;
  serving_unit: string;
}

export function FoodSearchDialog({ mealType }: { mealType: MealType }) {
  const [isOpen, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [results, setResults] = React.useState<FoodResult[]>([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<FoodResult | null>(null);
  const [quantity, setQuantity] = React.useState("1");
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (query.trim().length < 2) {
      // Data fetch synchronized to the query changing (debounced) — a valid
      // effect use case, this branch just clears stale results/errors first.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setSearchError(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
        const json = await response.json();
        if (!response.ok) {
          setSearchError(json.error ?? "Search failed");
          setResults([]);
        } else {
          setResults(json.data ?? []);
        }
      } catch {
        setSearchError("Couldn't reach the food search service");
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setQuantity("1");
    setSearchError(null);
  }

  function handleLog() {
    if (!selected) return;
    const formData = new FormData();
    formData.set("foodId", selected.id);
    formData.set("name", selected.name);
    formData.set("mealType", mealType);
    formData.set("quantity", quantity);
    formData.set("baseCalories", String(selected.calories));
    formData.set("baseProteinG", String(selected.protein_g));
    formData.set("baseFatG", String(selected.fat_g));
    formData.set("baseCarbsG", String(selected.carbs_g));
    formData.set("baseFiberG", String(selected.fiber_g));

    startTransition(async () => {
      const result = await logFood(formData);
      if (result.error) {
        toast.error("Couldn't log that food", { description: result.error });
        return;
      }
      toast.success(`Logged ${selected.name}`);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) reset();
      }}
    >
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Add food
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add food</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search foods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {isSearching && (
                <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchError && <p className="text-sm text-destructive">{searchError}</p>}

            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => setSelected(food)}
                  className="flex flex-col items-start gap-0.5 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{food.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {food.brand ? `${food.brand} · ` : ""}
                    {Math.round(food.calories)} cal per {food.serving_size} {food.serving_unit}
                  </span>
                </button>
              ))}
              {!isSearching && query.trim().length >= 2 && results.length === 0 && !searchError && (
                <p className="px-1 text-sm text-muted-foreground">No matches found.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(selected.calories)} cal · {selected.protein_g}g protein ·{" "}
                {selected.carbs_g}g carbs · {selected.fat_g}g fat per {selected.serving_size}{" "}
                {selected.serving_unit}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fs-quantity">Servings</Label>
              <Input
                id="fs-quantity"
                type="number"
                min={0.1}
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setSelected(null)}>
              ← Back to search
            </Button>
          </div>
        )}

        {selected && (
          <DialogFooter>
            <Button onClick={handleLog} disabled={isPending || !quantity}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Log to {mealType}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
