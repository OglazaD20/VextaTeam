"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { moveTaskToDay } from "@/app/(app)/today/actions";
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
import type { Tables } from "@/types/database";

export function MoveToDayDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Tables<"schedule_items">;
}) {
  const [date, setDate] = React.useState(item.scheduled_start?.slice(0, 10) ?? "");
  const [wasOpen, setWasOpen] = React.useState(open);
  const [isPending, startTransition] = React.useTransition();

  // Reset the date field whenever the dialog transitions to open, without an effect.
  if (open && !wasOpen) {
    setWasOpen(true);
    setDate(item.scheduled_start?.slice(0, 10) ?? "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleMove() {
    if (!date || !item.scheduled_start) return;

    const [year, month, day] = date.split("-").map(Number);
    const oldStart = new Date(item.scheduled_start);
    const oldEnd = item.scheduled_end ? new Date(item.scheduled_end) : oldStart;
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(oldStart);
    newStart.setFullYear(year, month - 1, day);
    const newEnd = new Date(newStart.getTime() + durationMs);

    startTransition(async () => {
      const result = await moveTaskToDay(item.id, newStart.toISOString(), newEnd.toISOString());
      if (result.error) {
        toast.error("Couldn't move that task", { description: result.error });
        return;
      }
      toast.success(`Moved to ${newStart.toLocaleDateString()}`);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Move task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="move-date">New date</Label>
          <Input
            id="move-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={handleMove} disabled={isPending || !date}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
