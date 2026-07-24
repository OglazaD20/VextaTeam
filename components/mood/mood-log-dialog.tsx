"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { logMood } from "@/app/(app)/mood/actions";
import { ScalePicker } from "@/components/mood/scale-picker";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MOOD_DIMENSIONS, type MoodDimension } from "@/lib/mood/dimensions";
import { cn } from "@/lib/utils";

const SECONDARY_DIMENSIONS = MOOD_DIMENSIONS.filter((d) => d.key !== "mood");

export function MoodLogDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [values, setValues] = React.useState<Partial<Record<MoodDimension, number>>>({});
  const [note, setNote] = React.useState("");
  const [isMoreOpen, setMoreOpen] = React.useState(false);

  function reset() {
    setValues({});
    setNote("");
    setMoreOpen(false);
  }

  function handleSubmit() {
    if (!values.mood) {
      toast.error("Pick a mood first");
      return;
    }

    startTransition(async () => {
      const result = await logMood({
        mood: values.mood!,
        stress: values.stress,
        energy: values.energy,
        motivation: values.motivation,
        productivity: values.productivity,
        happiness: values.happiness,
        sleepQuality: values.sleepQuality,
        anxiety: values.anxiety,
        confidence: values.confidence,
        focus: values.focus,
        note: note || undefined,
      });
      if (result.error) {
        toast.error("Couldn't log that", { description: result.error });
        return;
      }
      toast.success("Logged");
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) reset();
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> How are you feeling?
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick check-in</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <ScalePicker
            label="Mood"
            value={values.mood ?? null}
            onChange={(v) => setValues((prev) => ({ ...prev, mood: v }))}
          />

          <Collapsible open={isMoreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                More dimensions (optional)
                <ChevronDownIcon
                  className={cn("size-3.5 transition-transform", isMoreOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-4 pt-3">
                {SECONDARY_DIMENSIONS.map((dim) => (
                  <ScalePicker
                    key={dim.key}
                    label={dim.label}
                    value={values[dim.key] ?? null}
                    onChange={(v) => setValues((prev) => ({ ...prev, [dim.key]: v }))}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind? (optional)"
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !values.mood}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Log check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
