"use client";

import { MOOD_SCALE_EMOJI, MOOD_SCALE_LABEL } from "@/lib/mood/dimensions";
import { cn } from "@/lib/utils";

export function ScalePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-1">
        {MOOD_SCALE_EMOJI.map((emoji, index) => {
          const level = index + 1;
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              aria-label={`${label}: ${MOOD_SCALE_LABEL[index]}`}
              title={MOOD_SCALE_LABEL[index]}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 text-xl transition-colors",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-accent",
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
