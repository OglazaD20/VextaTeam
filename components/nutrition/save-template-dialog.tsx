"use client";

import * as React from "react";
import { BookmarkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { saveMealAsTemplate } from "@/app/(app)/nutrition/actions";
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

export function SaveTemplateDialog({
  mealType,
  items,
}: {
  mealType: MealType;
  items: { foodId: string; quantity: number }[];
}) {
  const [isOpen, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await saveMealAsTemplate({ name: name.trim(), mealType, items });
      if (result.error) {
        toast.error("Couldn't save that template", { description: result.error });
        return;
      }
      toast.success("Template saved");
      setName("");
      setOpen(false);
    });
  }

  if (items.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Save as template">
        <BookmarkIcon className="size-3.5" />
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="st-name">Template name</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekday breakfast"
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
