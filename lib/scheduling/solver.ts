import { computeFreeGaps, type Interval } from "./gaps";
import type { FlexibleItem, SolveInput, SolveResult } from "./types";

const MINUTE_MS = 60_000;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MINUTE_MS;
}

/**
 * Priority-sorted, first-fit placement: urgent items first, earlier due
 * dates before later ones, longer items before shorter ones within the same
 * priority/due-date tier (reduces fragmentation of remaining gaps).
 */
function sortForPlacement(items: FlexibleItem[]): FlexibleItem[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;

    const aDue = a.dueAt?.getTime() ?? Infinity;
    const bDue = b.dueAt?.getTime() ?? Infinity;
    if (aDue !== bDue) return aDue - bDue;

    return b.durationMinutes - a.durationMinutes;
  });
}

/** Finds the first gap that fits `durationMinutes` and ends by `deadline`. */
function findFittingGapIndex(
  gaps: Interval[],
  durationMinutes: number,
  deadline: Date,
): number {
  return gaps.findIndex((gap) => {
    const fits = minutesBetween(gap.start, gap.end) >= durationMinutes;
    const meetsDeadline = addMinutes(gap.start, durationMinutes).getTime() <= deadline.getTime();
    return fits && meetsDeadline;
  });
}

export function solveSchedule(input: SolveInput): SolveResult {
  const bufferMinutes = input.bufferMinutes ?? 0;
  const gaps = computeFreeGaps(
    input.dayWindow,
    input.fixed.map((f) => ({ start: f.start, end: f.end })),
  );

  const placements: SolveResult["placements"] = [];
  const unscheduled: string[] = [];

  for (const item of sortForPlacement(input.flexible)) {
    const deadline = item.dueAt ?? input.dayWindow.end;

    let gapIndex = findFittingGapIndex(gaps, item.durationMinutes, deadline);
    if (gapIndex === -1 && item.dueAt) {
      // Nothing fits before the due date — better to schedule late than
      // not at all. Fall back to any gap that fits within the day window.
      gapIndex = findFittingGapIndex(gaps, item.durationMinutes, input.dayWindow.end);
    }

    if (gapIndex === -1) {
      unscheduled.push(item.id);
      continue;
    }

    const gap = gaps[gapIndex];
    const start = gap.start;
    const end = addMinutes(start, item.durationMinutes);
    placements.push({ id: item.id, start, end });

    const nextGapStart = addMinutes(end, bufferMinutes);
    if (nextGapStart.getTime() >= gap.end.getTime()) {
      gaps.splice(gapIndex, 1);
    } else {
      gaps[gapIndex] = { start: nextGapStart, end: gap.end };
    }
  }

  placements.sort((a, b) => a.start.getTime() - b.start.getTime());

  return { placements, unscheduled };
}
