"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { createScheduleItem, getTaskDetails, updateScheduleItem } from "@/app/(app)/today/actions";
import { AttachmentList } from "@/components/tasks/attachment-list";
import { RecurrencePicker } from "@/components/tasks/recurrence-picker";
import { TagInput } from "@/components/tasks/tag-input";
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
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL } from "@/lib/scheduling/category-style";
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
  /** YYYY-MM-DD to prefill the scheduled time on, when creating from a specific day. */
  defaultDate?: string;
}) {
  const isEditMode = !!item;
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  const resetForCreate = React.useCallback(() => {
    setTitle("");
    setType("task");
    setPriority("3");
    setCategory("");
    setLocation("");
    setNotes("");
    setTags([]);
    setAiSchedule(false);
    setIsFixed(false);
    const base = defaultDate ? new Date(`${defaultDate}T09:00:00`) : new Date();
    setStartLocal(toLocalInputValue(roundToNextQuarterHour(base)));
    setDurationMinutes("30");
    setDueDate("");
    setRecurrenceRule(null);
    setAttachments([]);
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

    setIsLoadingDetails(true);
    const result = await getTaskDetails(task.id);
    setIsLoadingDetails(false);
    if (result.data) {
      setTags(result.data.tags);
      setAttachments(result.data.attachments as Tables<"task_attachments">[]);
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
            {isEditMode ? "Update the details below." : "Fill in as much or as little as you like."}
          </DialogDescription>
        </DialogHeader>

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

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium">Let AI find the time</p>
              <p className="text-xs text-muted-foreground">
                Placed automatically next time you plan your day.
              </p>
            </div>
            <Switch checked={aiSchedule} onCheckedChange={setAiSchedule} />
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
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te-start">Starts</Label>
                  <Input
                    id="te-start"
                    type="datetime-local"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="te-duration2">Duration (min)</Label>
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
