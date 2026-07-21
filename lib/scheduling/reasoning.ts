import { toZonedTime } from "date-fns-tz";

import type { FixedInterval, SchedulePlacement } from "./types";

export type Chronotype = "early_bird" | "night_owl" | "flexible";

/** Local-hour window (24h, [start, end)) where this chronotype tends to do its best work. */
export function getProductiveWindow(chronotype: Chronotype): [number, number] {
  switch (chronotype) {
    case "early_bird":
      return [6, 11];
    case "night_owl":
      return [15, 21];
    default:
      return [9, 12];
  }
}

const ADJACENCY_TOLERANCE_MINUTES = 15;
const HABIT_TIME_TOLERANCE_MINUTES = 30;

export interface PlacementItemInfo {
  id: string;
  title: string;
  habitPreferredTime?: string | null; // "HH:MM"
}

export interface PlacementFact {
  id: string;
  title: string;
  isDuringProductiveWindow: boolean;
  adjacentFixedTitle: string | null;
  isHabitAtPreferredTime: boolean;
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60_000;
}

export function computePlacementFacts(
  placements: SchedulePlacement[],
  fixed: (FixedInterval & { title: string })[],
  itemsById: Map<string, PlacementItemInfo>,
  chronotype: Chronotype,
  timeZone: string,
): PlacementFact[] {
  const [windowStart, windowEnd] = getProductiveWindow(chronotype);

  return placements.map((placement) => {
    const info = itemsById.get(placement.id);
    const zonedStart = toZonedTime(placement.start, timeZone);
    const startHour = zonedStart.getHours() + zonedStart.getMinutes() / 60;

    const isDuringProductiveWindow = startHour >= windowStart && startHour < windowEnd;

    const adjacent = fixed.find(
      (f) =>
        minutesBetween(f.end, placement.start) <= ADJACENCY_TOLERANCE_MINUTES ||
        minutesBetween(f.start, placement.end) <= ADJACENCY_TOLERANCE_MINUTES,
    );

    let isHabitAtPreferredTime = false;
    if (info?.habitPreferredTime) {
      const [prefHour, prefMinute] = info.habitPreferredTime.split(":").map(Number);
      const preferredMinutesOfDay = prefHour * 60 + prefMinute;
      const actualMinutesOfDay = zonedStart.getHours() * 60 + zonedStart.getMinutes();
      isHabitAtPreferredTime =
        Math.abs(preferredMinutesOfDay - actualMinutesOfDay) <= HABIT_TIME_TOLERANCE_MINUTES;
    }

    return {
      id: placement.id,
      title: info?.title ?? "Untitled",
      isDuringProductiveWindow,
      adjacentFixedTitle: adjacent?.title ?? null,
      isHabitAtPreferredTime,
    };
  });
}

/** Only the facts worth explaining to the user — skip routine, unremarkable placements. */
export function notablePlacementFacts(facts: PlacementFact[]): PlacementFact[] {
  return facts.filter(
    (f) => f.isDuringProductiveWindow || f.adjacentFixedTitle !== null || f.isHabitAtPreferredTime,
  );
}
