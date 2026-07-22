"use client";

import * as React from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { addMilestone, deleteMilestone, toggleMilestone } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function MilestoneList({
  goalId,
  milestones,
}: {
  goalId: string;
  milestones: Tables<"goal_milestones">[];
}) {
  const [newTitle, setNewTitle] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function handleToggle(id: string) {
    startTransition(async () => {
      const result = await toggleMilestone(id);
      if (result.error) toast.error("Couldn't update that milestone", { description: result.error });
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMilestone(id);
      if (result.error) toast.error("Couldn't remove that milestone", { description: result.error });
    });
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const title = newTitle.trim();
    setNewTitle("");
    startTransition(async () => {
      const result = await addMilestone({ goalId, title });
      if (result.error) toast.error("Couldn't add that milestone", { description: result.error });
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {milestones.map((milestone) => (
        <div key={milestone.id} className="group flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => handleToggle(milestone.id)}
            disabled={isPending}
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border",
              milestone.is_completed
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border",
            )}
            aria-label={milestone.is_completed ? "Mark incomplete" : "Mark complete"}
          >
            {milestone.is_completed && <span className="text-[9px]">✓</span>}
          </button>
          <span className={cn("flex-1", milestone.is_completed && "text-muted-foreground line-through")}>
            {milestone.title}
          </span>
          <button
            type="button"
            onClick={() => handleDelete(milestone.id)}
            aria-label="Delete milestone"
            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a milestone…"
          className="h-8 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          disabled={!newTitle.trim()}
          aria-label="Add milestone"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
