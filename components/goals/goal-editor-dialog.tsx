"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, PlusIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { createGoal } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
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
import { GOAL_CATEGORY_ICON, GOAL_CATEGORY_LABEL } from "@/lib/goals/category-style";
import { cn } from "@/lib/utils";
import type { GoalCategory } from "@/types/database";

const CATEGORIES = Object.keys(GOAL_CATEGORY_LABEL) as GoalCategory[];

export function GoalEditorDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<GoalCategory>("personal");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [aiBreakdown, setAiBreakdown] = React.useState(true);
  const [isAdvancedOpen, setAdvancedOpen] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("category", category);
    formData.set("priority", priority);
    formData.set("aiBreakdown", String(aiBreakdown));

    startTransition(async () => {
      const result = await createGoal(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't create that goal", { description: result.error });
        return;
      }
      toast.success(
        aiBreakdown ? "Goal created — AI is breaking it into milestones" : "Goal created",
      );
      (event.target as HTMLFormElement).reset();
      setCategory("personal");
      setPriority("medium");
      setAdvancedOpen(false);
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> New goal
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input id="goal-title" name="title" placeholder="Run a marathon" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger id="goal-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {GOAL_CATEGORY_ICON[c]} {GOAL_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-deadline">Deadline (optional)</Label>
              <Input id="goal-deadline" name="deadline" type="date" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <SparklesIcon className="size-3.5" /> Let AI break this into a plan
              </p>
              <p className="text-xs text-muted-foreground">
                Generates milestones plus a few tasks to get started today.
              </p>
            </div>
            <Switch checked={aiBreakdown} onCheckedChange={setAiBreakdown} />
          </div>

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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-description">Description</Label>
                  <Textarea
                    id="goal-description"
                    name="description"
                    placeholder="Why this matters, what success looks like…"
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger id="goal-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-target">Target value (optional)</Label>
                    <Input
                      id="goal-target"
                      name="targetValue"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-unit">Unit</Label>
                    <Input id="goal-unit" name="unit" placeholder="books, kg, €…" />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Create goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
