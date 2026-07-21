"use client";

import * as React from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteRecipe, getUserRecipes } from "@/app/(app)/nutrition/actions";
import { RecipeBuilderDialog } from "@/components/nutrition/recipe-builder-dialog";
import type { Tables } from "@/types/database";

export function RecipesSection({ initialRecipes }: { initialRecipes: Tables<"foods">[] }) {
  const [recipes, setRecipes] = React.useState(initialRecipes);

  async function refresh() {
    const result = await getUserRecipes();
    if (result.data) setRecipes(result.data);
  }

  async function handleDelete(id: string) {
    const result = await deleteRecipe(id);
    if (result.error) {
      toast.error("Couldn't remove that recipe", { description: result.error });
      return;
    }
    setRecipes((current) => current.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Recipes</h3>
        <RecipeBuilderDialog onSaved={refresh} />
      </div>
      {recipes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Combine ingredients into a reusable recipe — it&apos;ll show up in food search.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <span className="truncate">
                {recipe.name}
                <span className="text-muted-foreground"> · {Math.round(recipe.calories)} cal/serving</span>
              </span>
              <button
                type="button"
                onClick={() => handleDelete(recipe.id)}
                aria-label="Delete recipe"
                className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
