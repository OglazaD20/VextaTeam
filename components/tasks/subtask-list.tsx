"use client";

import * as React from "react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { addSubtask, deleteSubtask, toggleSubtask } from "@/app/(app)/today/actions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function SubtaskList({
  itemId,
  subtasks,
  onChanged,
}: {
  itemId: string;
  subtasks: Tables<"task_subtasks">[];
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const doneCount = subtasks.filter((s) => s.is_completed).length;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsAdding(true);
    const result = await addSubtask(itemId, title);
    setIsAdding(false);

    if (result.error) {
      toast.error("Couldn't add that subtask", { description: result.error });
      return;
    }
    setNewTitle("");
    onChanged();
  }

  async function handleToggle(subtask: Tables<"task_subtasks">) {
    const result = await toggleSubtask(subtask.id, !subtask.is_completed);
    if (result.error) {
      toast.error("Couldn't update that subtask", { description: result.error });
      return;
    }
    onChanged();
  }

  async function handleDelete(id: string) {
    const result = await deleteSubtask(id);
    if (result.error) {
      toast.error("Couldn't remove that subtask", { description: result.error });
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2">
      {subtasks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {doneCount}/{subtasks.length} done
        </p>
      )}
      <div className="flex flex-col gap-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent/50"
          >
            <button
              type="button"
              onClick={() => handleToggle(subtask)}
              aria-label={subtask.is_completed ? "Mark as not done" : "Mark as done"}
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                subtask.is_completed
                  ? "border-success bg-success text-white"
                  : "border-border text-transparent",
              )}
            >
              <CheckIcon className="size-2.5" strokeWidth={4} />
            </button>
            <span
              className={cn(
                "flex-1 truncate text-sm",
                subtask.is_completed && "text-muted-foreground line-through",
              )}
            >
              {subtask.title}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(subtask.id)}
              aria-label="Remove subtask"
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a subtask…"
          className="h-8 text-sm"
        />
        <button
          type="submit"
          disabled={isAdding || !newTitle.trim()}
          aria-label="Add subtask"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <PlusIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}
