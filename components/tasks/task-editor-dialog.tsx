"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { createScheduleItem, getTaskDetails, updateScheduleItem } from "@/app/(app)/today/actions";
import { AttachmentList } from "@/components/tasks/attachment-list";
import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { SubtaskList } from "@/components/tasks/subtask-list";
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
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL } from "@/lib/scheduling/category-style";
import { cn } from "@/lib/utils";
import type { RecurrenceRule, Tables } from "@/types/database";

const TYPE_OPTIONS = ["task", "meeting", "deadline", "appointment", "break"] as const;
const PRIORITY_OPTIONS = [
  { value: "1", label: "1 — Urgent" },
  { value: "2", label: "2 — High" },
  { value: "3", label: "3 — Normal" },
  { value: "4", label: "4 — Low" },
  { value: "5", label: "5 — Someday" },
];
const CATEGORY_PRESETS = ["Work", "Personal", "Health", "Finance", "Learning", "Errands", "Social"];

interface ParsedResponse {
  data?: {
    title: string;
    type: (typeof TYPE_OPTIONS)[number];
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

export function TaskEditorDialog({
  open,
  onOpenChange,
  item,
  allTags,
  onSaved,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Tables<"schedule_items"> | null;
  allTags: string[];
  onSaved?: () => void;
  /** "YYYY-MM-DD" or a full "YYYY-MM-DDTHH:mm:ss" to prefill when creating from a specific day/time. */
  defaultDate?: string;
}) {
  const isEditMode = !!item;
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isAdvancedOpen, setAdvancedOpen] = React.useState(false);

  const [smartText, setSmartText] = React.useState("");
  const [isParsing, setIsParsing] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<(typeof TYPE_OPTIONS)[number]>("task");
  const [priority, setPriority] = React.useState("3");
  const [category, setCategory] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [aiSchedule, setAiSchedule] = React.useState(false);
  const [isFixed, setIsFixed] = React.useState(false);
  const [startLocal, setStartLocal] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState("30");
  const [dueDate, setDueDate] = React.useState("");
  const [recurrenceRule, setRecurrenceRule] = React.useState<RecurrenceRule | null>(null);
  const [attachments, setAttachments] = React.useState<Tables<"task_attachments">[]>([]);
  const [subtasks, setSubtasks] = React.useState<Tables<"task_subtasks">[]>([]);

  const resetForCreate = React.useCallback(() => {
    setSmartText("");
    setTitle("");
    setType("task");
    setPriority("3");
    setCategory("");
    setLocation("");
    setNotes("");
    setTags([]);
    setAiSchedule(false);
    setIsFixed(false);
    const base = defaultDate
      ? new Date(defaultDate.includes("T") ? defaultDate : `${defaultDate}T09:00:00`)
      : new Date();
    setStartLocal(toLocalInputValue(roundToNextQuarterHour(base)));
    setDurationMinutes("30");
    setDueDate("");
    setRecurrenceRule(null);
    setAttachments([]);
    setSubtasks([]);
    setAdvancedOpen(false);
  }, [defaultDate]);

  const loadTaskDetails = React.useCallback(async (task: Tables<"schedule_items">) => {
    setTitle(task.title);
    setType(task.type as (typeof TYPE_OPTIONS)[number]);
    setPriority(String(task.priority));
    setCategory(task.category ?? "");
    setLocation(task.location ?? "");
    setNotes(task.notes ?? "");
    setIsFixed(task.is_fixed);
    setRecurrenceRule(task.recurrence_rule);
    setDurationMinutes(String(task.estimated_duration_minutes ?? 30));
    setDueDate(task.due_at ? task.due_at.slice(0, 10) : "");

    if (task.scheduled_start) {
      setAiSchedule(false);
      setStartLocal(toLocalInputValue(new Date(task.scheduled_start)));
    } else {
      setAiSchedule(true);
    }

    setAdvancedOpen(
      task.type !== "task" ||
        task.priority !== 3 ||
        !!task.category ||
        !!task.location ||
        !!task.notes ||
        !!task.recurrence_rule ||
        task.is_fixed,
    );

    setIsLoadingDetails(true);
    const result = await getTaskDetails(task.id);
    setIsLoadingDetails(false);
    if (result.data) {
      setTags(result.data.tags);
      setAttachments(result.data.attachments as Tables<"task_attachments">[]);
      setSubtasks(result.data.subtasks);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      // Data fetch synchronized to the dialog opening — a valid effect use
      // case (not a derived-state mirror), even though it sets state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadTaskDetails(item);
    } else {
      resetForCreate();
    }
  }, [open, item, loadTaskDetails, resetForCreate]);

  async function refreshAttachments() {
    if (!item) return;
    const result = await getTaskDetails(item.id);
    if (result.data) setAttachments(result.data.attachments as Tables<"task_attachments">[]);
  }

  async function refreshSubtasks() {
    if (!item) return;
    const result = await getTaskDetails(item.id);
    if (result.data) setSubtasks(result.data.subtasks);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = new FormData();
    payload.set("title", title);
    payload.set("type", type);
    payload.set("priority", priority);
    payload.set("location", location);
    payload.set("category", category);
    payload.set("notes", notes);
    payload.set("isFixed", isFixed ? "true" : "false");
    payload.set("tagNames", JSON.stringify(tags));

    if (aiSchedule) {
      if (durationMinutes) payload.set("estimatedDurationMinutes", durationMinutes);
      if (dueDate) payload.set("dueAt", new Date(`${dueDate}T23:59:59`).toISOString());
    } else {
      const start = new Date(startLocal);
      const duration = Number(durationMinutes);
      const end = new Date(start.getTime() + duration * 60_000);
      payload.set("estimatedDurationMinutes", String(duration));
      payload.set("scheduledStart", start.toISOString());
      payload.set("scheduledEnd", end.toISOString());
      if (dueDate) payload.set("dueAt", new Date(`${dueDate}T23:59:59`).toISOString());
      if (recurrenceRule) payload.set("recurrenceRule", JSON.stringify(recurrenceRule));
    }

    startTransition(async () => {
      const result = isEditMode
        ? await updateScheduleItem(item!.id, payload)
        : await createScheduleItem(payload);

      if (result.error) {
        setError(result.error);
        toast.error("Couldn't save that task", { description: result.error });
        return;
      }

      toast.success(isEditMode ? "Task updated" : "Task added");
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details below."
              : "Title, time, done — everything else is optional."}
          </DialogDescription>
        </DialogHeader>

        {!isEditMode && (
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
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="te-title">Title</Label>
            <Input
              id="te-title"
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
                <Label htmlFor="te-duration">Duration (min, optional)</Label>
                <Input
                  id="te-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="te-due">Due date (optional)</Label>
                <Input
                  id="te-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="te-start">Time</Label>
                <Input
                  id="te-start"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="te-duration2">Duration (min, optional)</Label>
                <Input
                  id="te-duration2"
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
                      Placed automatically next time you plan your day.
                    </p>
                  </div>
                  <Switch checked={aiSchedule} onCheckedChange={setAiSchedule} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="te-type">Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                      <SelectTrigger id="te-type">
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
                    <Label htmlFor="te-priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="te-priority">
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
                  <Label htmlFor="te-category">Category</Label>
                  <Input
                    id="te-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Work, Health, Personal…"
                    list="te-category-presets"
                  />
                  <datalist id="te-category-presets">
                    {CATEGORY_PRESETS.map((preset) => (
                      <option key={preset} value={preset} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Tags</Label>
                  <TagInput value={tags} onChange={setTags} suggestions={allTags} />
                </div>

                {!aiSchedule && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="te-due2">Due date (optional)</Label>
                      <Input
                        id="te-due2"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te-location">Location (optional)</Label>
                  <Input
                    id="te-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Zoom, office, gym…"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te-notes">Notes</Label>
                  <Textarea
                    id="te-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else worth remembering…"
                    rows={3}
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

                {isEditMode && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Subtasks</Label>
                    {isLoadingDetails ? (
                      <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <SubtaskList
                        itemId={item!.id}
                        subtasks={subtasks}
                        onChanged={refreshSubtasks}
                      />
                    )}
                  </div>
                )}

                {isEditMode && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Attachments</Label>
                    {isLoadingDetails ? (
                      <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <AttachmentList
                        itemId={item!.id}
                        attachments={attachments}
                        onChanged={refreshAttachments}
                      />
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              {isEditMode ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
