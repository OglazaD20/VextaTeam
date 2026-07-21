"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createCustomFood } from "@/app/(app)/nutrition/actions";
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

const MEAL_OPTIONS = [
  { value: "none", label: "No default" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
];

export function CreateCustomFoodDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [defaultMealType, setDefaultMealType] = React.useState("none");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("defaultMealType", defaultMealType === "none" ? "" : defaultMealType);

    startTransition(async () => {
      const result = await createCustomFood(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't save that food", { description: result.error });
        return;
      }
      toast.success("Food saved — find it under Search or Favorites");
      setDefaultMealType("none");
      (event.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> New food
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a custom food</DialogTitle>
          <DialogDescription>Saved to your library — searchable and favoritable later.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="cf-name">Name</Label>
              <Input id="cf-name" name="name" placeholder="Grandma's lasagna" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-brand">Brand (optional)</Label>
              <Input id="cf-brand" name="brand" placeholder="Homemade" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-meal">Default meal</Label>
              <Select value={defaultMealType} onValueChange={setDefaultMealType}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-serving-size">Serving size</Label>
              <Input id="cf-serving-size" name="servingSize" type="number" min={0} step="any" defaultValue={1} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-serving-unit">Unit</Label>
              <Input id="cf-serving-unit" name="servingUnit" placeholder="cup, slice, serving…" defaultValue="serving" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-weight">Weight per serving (g, optional)</Label>
            <Input id="cf-weight" name="weightG" type="number" min={0} step="any" placeholder="e.g. 240" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-calories">Calories</Label>
              <Input id="cf-calories" name="calories" type="number" min={0} step="any" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-protein">Protein (g)</Label>
              <Input id="cf-protein" name="proteinG" type="number" min={0} step="any" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-fat">Fat (g)</Label>
              <Input id="cf-fat" name="fatG" type="number" min={0} step="any" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cf-carbs">Carbs (g)</Label>
              <Input id="cf-carbs" name="carbsG" type="number" min={0} step="any" required />
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
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save food
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
