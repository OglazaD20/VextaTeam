import { describe, expect, it } from "vitest";

import { solveSchedule } from "@/lib/scheduling/solver";
import type { FlexibleItem } from "@/lib/scheduling/types";

function d(hour: number, minute = 0) {
  return new Date(2026, 0, 1, hour, minute, 0, 0);
}

const dayWindow = { start: d(8), end: d(18) };

describe("solveSchedule", () => {
  it("places a single flexible item at the start of an empty day", () => {
    const flexible: FlexibleItem[] = [{ id: "a", priority: 3, durationMinutes: 60 }];
    const result = solveSchedule({ dayWindow, fixed: [], flexible });

    expect(result.unscheduled).toEqual([]);
    expect(result.placements).toEqual([{ id: "a", start: d(8), end: d(9) }]);
  });

  it("schedules the higher-priority item first regardless of input order", () => {
    const flexible: FlexibleItem[] = [
      { id: "low", priority: 5, durationMinutes: 60 },
      { id: "urgent", priority: 1, durationMinutes: 60 },
    ];
    const result = solveSchedule({ dayWindow, fixed: [], flexible });

    const urgent = result.placements.find((p) => p.id === "urgent")!;
    const low = result.placements.find((p) => p.id === "low")!;
    expect(urgent.start.getTime()).toBeLessThan(low.start.getTime());
  });

  it("never overlaps a fixed meeting", () => {
    const fixed = [{ id: "meeting", start: d(9), end: d(10) }];
    const flexible: FlexibleItem[] = [{ id: "task", priority: 3, durationMinutes: 90 }];
    const result = solveSchedule({ dayWindow, fixed, flexible });

    const task = result.placements[0];
    const overlapsMeeting = task.start < fixed[0].end && task.end > fixed[0].start;
    expect(overlapsMeeting).toBe(false);
  });

  it("leaves a buffer between consecutively placed items", () => {
    const flexible: FlexibleItem[] = [
      { id: "a", priority: 1, durationMinutes: 60 },
      { id: "b", priority: 2, durationMinutes: 60 },
    ];
    const result = solveSchedule({ dayWindow, fixed: [], flexible, bufferMinutes: 15 });

    const [a, b] = result.placements;
    expect(b.start.getTime() - a.end.getTime()).toBe(15 * 60_000);
  });

  it("schedules a due-dated item before its deadline when a gap allows it", () => {
    const flexible: FlexibleItem[] = [
      { id: "deadline-task", priority: 3, durationMinutes: 60, dueAt: d(11) },
    ];
    const result = solveSchedule({ dayWindow, fixed: [], flexible });

    expect(result.placements[0].end.getTime()).toBeLessThanOrEqual(d(11).getTime());
  });

  it("still schedules a due-dated item late rather than dropping it, when the deadline can't be met", () => {
    const fixed = [{ id: "blocker", start: d(8), end: d(11) }];
    const flexible: FlexibleItem[] = [
      { id: "deadline-task", priority: 3, durationMinutes: 60, dueAt: d(10) },
    ];
    const result = solveSchedule({ dayWindow, fixed, flexible });

    expect(result.unscheduled).toEqual([]);
    expect(result.placements[0].start.getTime()).toBeGreaterThanOrEqual(d(11).getTime());
  });

  it("marks an item as unscheduled when nothing fits anywhere in the window", () => {
    const flexible: FlexibleItem[] = [{ id: "too-big", priority: 3, durationMinutes: 700 }];
    const result = solveSchedule({ dayWindow, fixed: [], flexible });

    expect(result.placements).toEqual([]);
    expect(result.unscheduled).toEqual(["too-big"]);
  });

  it("fits a shorter item into a gap left by an earlier unplaceable item", () => {
    const flexible: FlexibleItem[] = [
      { id: "big", priority: 1, durationMinutes: 700 },
      { id: "small", priority: 2, durationMinutes: 30 },
    ];
    const result = solveSchedule({ dayWindow, fixed: [], flexible });

    expect(result.unscheduled).toEqual(["big"]);
    expect(result.placements.map((p) => p.id)).toEqual(["small"]);
  });
});
