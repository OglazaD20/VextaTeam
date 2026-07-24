export interface FixedInterval {
  id: string;
  start: Date;
  end: Date;
}

export interface FlexibleItem {
  id: string;
  /** 1 (urgent) .. 5 (someday), matches schedule_items.priority */
  priority: number;
  durationMinutes: number;
  dueAt?: Date;
}

export interface SchedulePlacement {
  id: string;
  start: Date;
  end: Date;
}

export interface SolveInput {
  /** The bounds within which items may be placed, e.g. wake time to sleep time. */
  dayWindow: { start: Date; end: Date };
  /** Immovable anchors — meetings, appointments, already-fixed items. */
  fixed: FixedInterval[];
  /** Items the solver is free to place. */
  flexible: FlexibleItem[];
  /** Gap left after each placed item, in minutes. */
  bufferMinutes?: number;
}

export interface SolveResult {
  placements: SchedulePlacement[];
  /** Ids of flexible items that didn't fit anywhere in the window. */
  unscheduled: string[];
}
