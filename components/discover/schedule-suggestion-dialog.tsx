"use client";

import * as React from "react";
import { CalendarPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultStartLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 60);
  return d.toISOString().slice(0, 16);
}

export function ScheduleSuggestionDialog({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm: (whenIso: string) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  const [startLocal, setStartLocal] = React.useState(defaultStartLocal);
  const [isPending, startTransition] = React.useTransition();

  function handleConfirm() {
    if (!startLocal) return;
    startTransition(async () => {
      const whenIso = new Date(startLocal).toISOString();
      const result = await onConfirm(whenIso);
      if (result.error) {
        toast.error("Couldn't add to your calendar", { description: result.error });
      } else {
        toast.success("Added to your calendar");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlusIcon className="size-3.5" /> Add to calendar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule &quot;{title}&quot;</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="suggestion-start">Date & time</Label>
          <Input
            id="suggestion-start"
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isPending || !startLocal}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
