"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { createRecipe } from "@/app/(app)/nutrition/actions";
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

interface SearchFood {
  id: string;
  name: string;
  calories: number;
}

interface RecipeIngredient {
  foodId: string;
  name: string;
  quantity: string;
}

export function RecipeBuilderDialog({ onSaved }: { onSaved: () => void }) {
  const [isOpen, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [servings, setServings] = React.useState("1");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchFood[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
        const json = await response.json();
        if (response.ok) setResults(json.data ?? []);
      } catch {
        // silent — search is best-effort here
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  function addIngredient(food: SearchFood) {
    if (ingredients.some((i) => i.foodId === food.id)) return;
    setIngredients((current) => [...current, { foodId: food.id, name: food.name, quantity: "1" }]);
    setQuery("");
    setResults([]);
  }

  function updateQuantity(foodId: string, quantity: string) {
    setIngredients((current) => current.map((i) => (i.foodId === foodId ? { ...i, quantity } : i)));
  }

  function removeIngredient(foodId: string) {
    setIngredients((current) => current.filter((i) => i.foodId !== foodId));
  }

  function reset() {
    setName("");
    setServings("1");
    setQuery("");
    setResults([]);
    setIngredients([]);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (ingredients.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    startTransition(async () => {
      const result = await createRecipe({
        name,
        servings: Number(servings),
        ingredients: ingredients.map((i) => ({ foodId: i.foodId, quantity: Number(i.quantity) })),
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't save that recipe", { description: result.error });
        return;
      }
      toast.success("Recipe saved — find it in Search");
      reset();
      setOpen(false);
      onSaved();
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
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> New recipe
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Build a recipe</DialogTitle>
          <DialogDescription>
            Combine existing foods — macros are computed per serving automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="rb-name">Recipe name</Label>
              <Input
                id="rb-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chicken stir-fry"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rb-servings">Servings</Label>
              <Input
                id="rb-servings"
                type="number"
                min={1}
                step="1"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-search">Add ingredients</Label>
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="rb-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods to add…"
                className="pl-9"
              />
              {isSearching && (
                <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {results.length > 0 && (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-border p-1">
                {results.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => addIngredient(food)}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span>{food.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(food.calories)} kcal
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Ingredients</Label>
              {ingredients.map((ingredient) => (
                <div key={ingredient.foodId} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm">{ingredient.name}</span>
                  <Input
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={ingredient.quantity}
                    onChange={(e) => updateQuantity(ingredient.foodId, e.target.value)}
                    className="w-20"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(ingredient.foodId)}
                    aria-label="Remove ingredient"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save recipe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
