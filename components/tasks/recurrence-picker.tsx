"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RecurrenceRule } from "@/types/database";

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

export function RecurrencePicker({
  value,
  onChange,
  disabled,
}: {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  disabled?: boolean;
}) {
  const isEnabled = value !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Repeat</p>
          {disabled && (
            <p className="text-xs text-muted-foreground">Give this task a start time first.</p>
          )}
        </div>
        <Switch
          checked={isEnabled}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange(checked ? { freq: "weekly", interval: 1, byWeekday: [] } : null)
          }
        />
      </div>

      {isEnabled && value && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Every</span>
            <Input
              type="number"
              min={1}
              max={30}
              value={value.interval}
              onChange={(e) => onChange({ ...value, interval: Number(e.target.value) || 1 })}
              className="h-8 w-16"
            />
            <Select
              value={value.freq}
              onValueChange={(freq) =>
                onChange({ ...value, freq: freq as RecurrenceRule["freq"] })
              }
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">day(s)</SelectItem>
                <SelectItem value="weekly">week(s)</SelectItem>
                <SelectItem value="monthly">month(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.freq === "weekly" && (
            <div className="flex items-center gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = value.byWeekday?.includes(day.value) ?? false;
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const current = value.byWeekday ?? [];
                      const next = active
                        ? current.filter((d) => d !== day.value)
                        : [...current, day.value];
                      onChange({ ...value, byWeekday: next });
                    }}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
