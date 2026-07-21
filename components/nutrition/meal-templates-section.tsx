"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { applyMealTemplate, deleteMealTemplate } from "@/app/(app)/nutrition/actions";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

type TemplateWithCount = Tables<"meal_templates"> & { itemCount: number };

export function MealTemplatesSection({ templates }: { templates: TemplateWithCount[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  if (templates.length === 0) return null;

  async function handleApply(id: string) {
    setPendingId(id);
    const result = await applyMealTemplate(id);
    setPendingId(null);
    if (result.error) {
      toast.error("Couldn't log that template", { description: result.error });
    } else {
      toast.success("Logged");
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteMealTemplate(id);
    if (result.error) {
      toast.error("Couldn't remove that template", { description: result.error });
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium">Meal templates</h3>
      <div className="flex flex-col gap-1">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50"
          >
            <span className="truncate">
              {template.name}
              <span className="text-muted-foreground"> · {template.itemCount} items</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingId === template.id}
                onClick={() => handleApply(template.id)}
              >
                {pendingId === template.id && <Loader2Icon className="size-3.5 animate-spin" />}
                Log
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(template.id)}
                aria-label="Delete template"
                className="p-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
