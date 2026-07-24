"use client";

import * as React from "react";
import { ArchiveIcon, ChevronDownIcon, UndoIcon } from "lucide-react";
import { toast } from "sonner";

import { unarchiveTask } from "@/app/(app)/today/actions";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function ArchivedSection({ items }: { items: Tables<"schedule_items">[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (items.length === 0) return null;

  async function handleUnarchive(id: string) {
    const result = await unarchiveTask(id);
    if (result.error) {
      toast.error("Couldn't restore that task", { description: result.error });
    } else {
      toast.success("Task restored");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArchiveIcon className="size-3.5" />
        Archived ({items.length})
        <ChevronDownIcon className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground"
            >
              <span className="truncate">{item.title}</span>
              <button
                type="button"
                onClick={() => handleUnarchive(item.id)}
                className="flex shrink-0 items-center gap-1 text-xs hover:text-foreground"
              >
                <UndoIcon className="size-3" /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
