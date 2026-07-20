import { DayCell, type DayCellStat } from "@/components/calendar/day-cell";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ stats }: { stats: DayCellStat[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {stats.map((stat) => (
          <DayCell key={stat.key} stat={stat} />
        ))}
      </div>
    </div>
  );
}
