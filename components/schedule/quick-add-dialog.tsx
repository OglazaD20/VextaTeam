"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { createScheduleItem } from "@/app/(app)/today/actions";
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
import { Switch } from "@/components/ui/switch";
import { CATEGORY_LABEL } from "@/lib/scheduling/category-style";
import { useUIStore } from "@/hooks/use-ui-store";

const TYPE_OPTIONS = ["task", "meeting", "deadline", "appointment", "break"] as const;
const PRIORITY_OPTIONS = [
  { value: "1", label: "1 — Urgent" },
  { value: "2", label: "2 — High" },
  { value: "3", label: "3 — Normal" },
  { value: "4", label: "4 — Low" },
  { value: "5", label: "5 — Someday" },
];

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function roundToNextQuarterHour(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15);
  return rounded;
}

export function QuickAddDialog() {
  const isOpen = useUIStore((state) => state.isQuickAddOpen);
  const setOpen = useUIStore((state) => state.setQuickAddOpen);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Recomputed on every render so reopening the dialog defaults to "now",
  // not a stale time from when it was first mounted.
  const defaultStart = toLocalInputValue(roundToNextQuarterHour(new Date()));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const startLocal = data.get("scheduledStartLocal") as string;
    const durationMinutes = Number(data.get("estimatedDurationMinutes"));
    const start = new Date(startLocal);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const payload = new FormData();
    payload.set("title", data.get("title") as string);
    payload.set("type", data.get("type") as string);
    payload.set("priority", data.get("priority") as string);
    payload.set("location", (data.get("location") as string) ?? "");
    payload.set("isFixed", data.get("isFixed") === "on" ? "true" : "false");
    payload.set("estimatedDurationMinutes", String(durationMinutes));
    payload.set("scheduledStart", start.toISOString());
    payload.set("scheduledEnd", end.toISOString());

    startTransition(async () => {
      const result = await createScheduleItem(payload);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that", { description: result.error });
        return;
      }
      toast.success("Added to your day");
      form.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to today</DialogTitle>
          <DialogDescription>
            Manual entry for now — AI-assisted scheduling arrives in a later
            milestone.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Finish deck" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="task">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CATEGORY_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="3">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
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
              <Label htmlFor="scheduledStartLocal">Starts</Label>
              <Input
                id="scheduledStartLocal"
                name="scheduledStartLocal"
                type="datetime-local"
                defaultValue={defaultStart}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estimatedDurationMinutes">Duration (min)</Label>
              <Input
                id="estimatedDurationMinutes"
                name="estimatedDurationMinutes"
                type="number"
                min={5}
                step={5}
                defaultValue={30}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" name="location" placeholder="Zoom, office, gym…" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Fixed time</p>
              <p className="text-xs text-muted-foreground">
                Can&apos;t be moved automatically once scheduling is AI-assisted.
              </p>
            </div>
            <Switch name="isFixed" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Add to today
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
