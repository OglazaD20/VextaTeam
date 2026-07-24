export interface Interval {
  start: Date;
  end: Date;
}

/** Merges overlapping/adjacent intervals, assuming none are zero-length. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [{ ...sorted[0] }];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/** Computes the free gaps in `window` after subtracting all `busy` intervals. */
export function computeFreeGaps(window: Interval, busy: Interval[]): Interval[] {
  const relevant = busy.filter(
    (b) => b.end.getTime() > window.start.getTime() && b.start.getTime() < window.end.getTime(),
  );
  const merged = mergeIntervals(relevant);

  const gaps: Interval[] = [];
  let cursor = window.start;

  for (const interval of merged) {
    const clampedStart = interval.start.getTime() < window.start.getTime() ? window.start : interval.start;
    if (clampedStart.getTime() > cursor.getTime()) {
      gaps.push({ start: cursor, end: clampedStart });
    }
    const clampedEnd = interval.end.getTime() > window.end.getTime() ? window.end : interval.end;
    if (clampedEnd.getTime() > cursor.getTime()) {
      cursor = clampedEnd;
    }
  }

  if (cursor.getTime() < window.end.getTime()) {
    gaps.push({ start: cursor, end: window.end });
  }

  return gaps;
}
