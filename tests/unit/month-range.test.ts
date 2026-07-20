import { describe, expect, it } from "vitest";

import { dateKey, getMonthGridDays } from "@/lib/scheduling/month-range";

describe("getMonthGridDays", () => {
  it("returns a whole number of weeks starting on Monday and ending on Sunday", () => {
    const days = getMonthGridDays(2026, 6); // July 2026
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[days.length - 1].getDay()).toBe(0); // Sunday
  });

  it("includes every day of the target month", () => {
    const days = getMonthGridDays(2026, 6); // July 2026 has 31 days
    const julyDays = days.filter((d) => d.getMonth() === 6 && d.getFullYear() === 2026);
    expect(julyDays).toHaveLength(31);
    expect(julyDays[0].getDate()).toBe(1);
    expect(julyDays[julyDays.length - 1].getDate()).toBe(31);
  });

  it("pads with adjacent-month days to fill the grid", () => {
    const days = getMonthGridDays(2026, 6); // July 2026
    expect(days[0].getMonth()).toBe(5); // June padding
    expect(days[days.length - 1].getMonth()).toBe(7); // August padding (July 31, 2026 is a Friday)
  });
});

describe("dateKey", () => {
  it("formats as YYYY-MM-DD with zero-padding", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 10, 30))).toBe("2026-11-30");
  });
});
