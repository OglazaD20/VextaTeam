import { toZonedTime } from "date-fns-tz";

/** Pure pixel/time math for the drag-and-resize day timeline. No DOM, no side effects. */

export const DEFAULT_PX_PER_MINUTE = 1; // 60px per hour
export const SNAP_MINUTES = 15;

export function minutesFromMidnight(date: Date, timeZone: string): number {
  const zoned = toZonedTime(date, timeZone);
  return zoned.getHours() * 60 + zoned.getMinutes() + zoned.getSeconds() / 60;
}

export function snapMinutes(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function minutesToPx(minutes: number, pxPerMinute: number = DEFAULT_PX_PER_MINUTE): number {
  return minutes * pxPerMinute;
}

export function pxToMinutes(px: number, pxPerMinute: number = DEFAULT_PX_PER_MINUTE): number {
  return px / pxPerMinute;
}

export function clampMinutes(minutes: number, min = 0, max = 24 * 60): number {
  return Math.min(max, Math.max(min, minutes));
}
