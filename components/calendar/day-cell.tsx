import Link from "next/link";

import { cn } from "@/lib/utils";

export interface DayCellStat {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  tasksTotal: number;
  tasksDone: number;
  habitTotal: number;
  habitDone: number;
}

export function DayCell({ stat }: { stat: DayCellStat }) {
  const hasActivity = stat.tasksTotal > 0 || stat.habitTotal > 0;
  const tasksPerfect = stat.tasksTotal === 0 || stat.tasksDone === stat.tasksTotal;
  const habitsPerfect = stat.habitTotal === 0 || stat.habitDone === stat.habitTotal;
  const isPerfectDay =
    hasActivity && (stat.isPast || stat.isToday) && tasksPerfect && habitsPerfect;

  return (
    <Link
      href={`/calendar/day/${stat.key}`}
      className={cn(
        "flex min-h-20 flex-col gap-1 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-accent/50",
        !stat.inMonth && "opacity-40",
        isPerfectDay && "ring-1 ring-success/60",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-medium",
          stat.isToday && "bg-primary text-primary-foreground",
        )}
      >
        {stat.dayOfMonth}
      </span>

      {stat.tasksTotal > 0 && (
        <span className="text-[11px] text-muted-foreground">
          {stat.tasksDone === stat.tasksTotal ? "✓" : "○"} {stat.tasksDone}/{stat.tasksTotal}
        </span>
      )}
      {stat.habitTotal > 0 && (
        <span className="text-[11px] text-muted-foreground">
          habits {Math.round((stat.habitDone / stat.habitTotal) * 100)}%
        </span>
      )}
    </Link>
  );
}
