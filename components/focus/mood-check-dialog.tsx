"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];
const ENERGY_EMOJI = ["🪫", "🔋", "🔋", "⚡", "⚡"];

function ScaleButtons({
  value,
  onChange,
  emoji,
}: {
  value: number | null;
  onChange: (value: number) => void;
  emoji: string[];
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      {emoji.map((icon, index) => {
        const scaleValue = index + 1;
        return (
          <button
            key={scaleValue}
            type="button"
            onClick={() => onChange(scaleValue)}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border text-lg transition-colors",
              value === scaleValue
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
            )}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export function MoodCheckDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (result: { mood?: number; energy?: number }) => void;
}) {
  const [mood, setMood] = React.useState<number | null>(null);
  const [energy, setEnergy] = React.useState<number | null>(null);

  function reset() {
    setMood(null);
    setEnergy(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How did that session go?</DialogTitle>
          <DialogDescription>
            Optional — helps your weekly stats spot patterns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-medium">Mood</p>
            <ScaleButtons value={mood} onChange={setMood} emoji={MOOD_EMOJI} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Energy</p>
            <ScaleButtons value={energy} onChange={setEnergy} emoji={ENERGY_EMOJI} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onSubmit({});
            }}
          >
            Skip
          </Button>
          <Button
            onClick={() => {
              onSubmit({ mood: mood ?? undefined, energy: energy ?? undefined });
              reset();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
