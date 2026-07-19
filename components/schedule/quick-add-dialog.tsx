"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
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
type ItemType = (typeof TYPE_OPTIONS)[number];

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

interface ParsedResponse {
  data?: {
    title: string;
    type: ItemType;
    estimatedDurationMinutes: number | null;
    dueAt: string | null;
    priority: number;
  };
  error?: string;
}

export function QuickAddDialog() {
  const isOpen = useUIStore((state) => state.isQuickAddOpen);
  const setOpen = useUIStore((state) => state.setQuickAddOpen);
  const [isPending, startTransition] = React.useTransition();
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const [smartText, setSmartText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ItemType>("task");
  const [priority, setPriority] = React.useState("3");
  const [aiSchedule, setAiSchedule] = React.useState(false);
  const [durationMinutes, setDurationMinutes] = React.useState("30");
  const [dueDate, setDueDate] = React.useState("");

  // Recomputed on every render so reopening the dialog defaults to "now",
  // not a stale time from when it was first mounted.
  const defaultStart = toLocalInputValue(roundToNextQuarterHour(new Date()));

  async function handleParse() {
    if (!smartText.trim()) return;
    setIsParsing(true);
    try {
      const response = await fetch("/api/ai/parse-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: smartText }),
      });
      const result: ParsedResponse = await response.json();

      if (!response.ok || result.error || !result.data) {
        toast.error("Couldn't parse that", { description: result.error });
        return;
      }

      setTitle(result.data.title);
      setType(result.data.type);
      setPriority(String(result.data.priority));
      if (result.data.estimatedDurationMinutes) {
        setDurationMinutes(String(result.data.estimatedDurationMinutes));
      }
      if (result.data.dueAt) {
        setAiSchedule(true);
        setDueDate(result.data.dueAt.slice(0, 10));
      }
      toast.success("Parsed — check the details below");
    } catch {
      toast.error("Couldn't reach the AI parser");
    } finally {
      setIsParsing(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = new FormData();

    payload.set("title", title);
    payload.set("type", type);
    payload.set("priority", priority);
    payload.set("location", (data.get("location") as string) ?? "");
    payload.set("isFixed", data.get("isFixed") === "on" ? "true" : "false");

    if (aiSchedule) {
      if (durationMinutes) payload.set("estimatedDurationMinutes", durationMinutes);
      if (dueDate) payload.set("dueAt", new Date(`${dueDate}T23:59:59`).toISOString());
    } else {
      const startLocal = data.get("scheduledStartLocal") as string;
      const duration = Number(durationMinutes);
      const start = new Date(startLocal);
      const end = new Date(start.getTime() + duration * 60_000);
      payload.set("estimatedDurationMinutes", String(duration));
      payload.set("scheduledStart", start.toISOString());
      payload.set("scheduledEnd", end.toISOString());
    }

    startTransition(async () => {
      const result = await createScheduleItem(payload);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that", { description: result.error });
        return;
      }
      toast.success(aiSchedule ? "Added — AI will place it when you plan your day" : "Added to your day");
      form.reset();
      setSmartText("");
      setTitle("");
      setType("task");
      setPriority("3");
      setAiSchedule(false);
      setDurationMinutes("30");
      setDueDate("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to today</DialogTitle>
          <DialogDescription>
            Describe it in plain language, or fill in the details yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            placeholder="Finish the deck, ~2h, before Friday"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleParse();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleParse} disabled={isParsing}>
            {isParsing ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            Parse
          </Button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Finish deck"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as ItemType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CATEGORY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
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

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Let AI find the time</p>
              <p className="text-xs text-muted-foreground">
                Adds it unscheduled — placed automatically next time you plan
                your day.
              </p>
            </div>
            <Switch checked={aiSchedule} onCheckedChange={setAiSchedule} />
          </div>

          {aiSchedule ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="durationMinutes">Duration (min, optional)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={5}
                  step={5}
                  placeholder="AI will estimate"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate">Due date (optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
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
                <Label htmlFor="durationMinutes">Duration (min)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={5}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" name="location" placeholder="Zoom, office, gym…" />
          </div>

          {!aiSchedule && (
            <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium">Fixed time</p>
                <p className="text-xs text-muted-foreground">
                  Won&apos;t be moved when you plan your day.
                </p>
              </div>
              <Switch name="isFixed" />
            </div>
          )}

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
