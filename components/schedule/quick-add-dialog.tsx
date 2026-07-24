"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { createScheduleItem, getUserTags } from "@/app/(app)/today/actions";
import { TagInput } from "@/components/tasks/tag-input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";
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
    scheduledStart: string | null;
    dueAt: string | null;
    priority: number;
    category: string | null;
    tags: string[];
    location: string | null;
  };
  error?: string;
}

export function QuickAddDialog() {
  const isOpen = useUIStore((state) => state.isQuickAddOpen);
  const setOpen = useUIStore((state) => state.setQuickAddOpen);
  const [isPending, startTransition] = React.useTransition();
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isAdvancedOpen, setAdvancedOpen] = React.useState(false);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [wasOpen, setWasOpen] = React.useState(isOpen);

  const [smartText, setSmartText] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ItemType>("task");
  const [priority, setPriority] = React.useState("3");
  const [category, setCategory] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [aiSchedule, setAiSchedule] = React.useState(false);
  const [isFixed, setIsFixed] = React.useState(false);
  const [durationMinutes, setDurationMinutes] = React.useState("30");
  const [dueDate, setDueDate] = React.useState("");
  const [startLocal, setStartLocal] = React.useState("");

  // Fetch the user's tags and reset to defaults whenever the dialog opens,
  // without an effect (React's recommended pattern for syncing from props).
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setStartLocal(toLocalInputValue(roundToNextQuarterHour(new Date())));
    void getUserTags().then((result) => {
      if (result.data) setAllTags(result.data.map((t) => t.name));
    });
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

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

      const data = result.data;
      setTitle(data.title);
      setType(data.type);
      setPriority(String(data.priority));
      if (data.estimatedDurationMinutes) {
        setDurationMinutes(String(data.estimatedDurationMinutes));
      }

      if (data.scheduledStart) {
        setAiSchedule(false);
        setStartLocal(toLocalInputValue(new Date(data.scheduledStart)));
      } else if (data.dueAt) {
        setAiSchedule(true);
        setDueDate(data.dueAt.slice(0, 10));
      }

      if (data.category) setCategory(data.category);
      if (data.tags.length > 0) setTags((current) => [...new Set([...current, ...data.tags])]);
      if (data.location) setLocation(data.location);
      if (data.category || data.tags.length > 0 || data.location || data.dueAt) {
        setAdvancedOpen(true);
      }

      toast.success("Parsed — check the details below");
    } catch {
      toast.error("Couldn't reach the AI parser");
    } finally {
      setIsParsing(false);
    }
  }

  function resetForm() {
    setSmartText("");
    setTitle("");
    setType("task");
    setPriority("3");
    setCategory("");
    setLocation("");
    setTags([]);
    setAiSchedule(false);
    setIsFixed(false);
    setDurationMinutes("30");
    setDueDate("");
    setAdvancedOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = new FormData();
    payload.set("title", title);
    payload.set("type", type);
    payload.set("priority", priority);
    payload.set("location", location);
    payload.set("isFixed", isFixed ? "true" : "false");
    payload.set("tagNames", JSON.stringify(tags));

    if (aiSchedule) {
      if (durationMinutes) payload.set("estimatedDurationMinutes", durationMinutes);
      if (dueDate) payload.set("dueAt", new Date(`${dueDate}T23:59:59`).toISOString());
    } else {
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
      resetForm();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to today</DialogTitle>
          <DialogDescription>
            Title, time, done — everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            placeholder="Gym tomorrow 18:00, or dinner Friday 20:00"
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qa-title">Title</Label>
            <Input
              id="qa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finish deck"
              required
              autoFocus
            />
          </div>

          {aiSchedule ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qa-duration">Duration (min, optional)</Label>
                <Input
                  id="qa-duration"
                  type="number"
                  min={5}
                  step={5}
                  placeholder="AI will estimate"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qa-due">Due date (optional)</Label>
                <Input
                  id="qa-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qa-start">Time</Label>
                <Input
                  id="qa-start"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qa-duration2">Duration (min, optional)</Label>
                <Input
                  id="qa-duration2"
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

          <Collapsible open={isAdvancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Advanced settings
                <ChevronDownIcon
                  className={cn("size-3.5 transition-transform", isAdvancedOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-4 pt-4">
                <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Let AI find the time</p>
                    <p className="text-xs text-muted-foreground">
                      Adds it unscheduled — placed automatically next time you plan your day.
                    </p>
                  </div>
                  <Switch checked={aiSchedule} onCheckedChange={setAiSchedule} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="qa-type">Type</Label>
                    <Select value={type} onValueChange={(value) => setType(value as ItemType)}>
                      <SelectTrigger id="qa-type">
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
                    <Label htmlFor="qa-priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="qa-priority">
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

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="qa-category">Category</Label>
                  <Input
                    id="qa-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Work, Health, Personal…"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Tags</Label>
                  <TagInput value={tags} onChange={setTags} suggestions={allTags} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="qa-location">Location (optional)</Label>
                  <Input
                    id="qa-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Zoom, office, gym…"
                  />
                </div>

                {!aiSchedule && (
                  <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium">Fixed time</p>
                      <p className="text-xs text-muted-foreground">
                        Won&apos;t be moved when you plan your day.
                      </p>
                    </div>
                    <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

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
