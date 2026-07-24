import { describe, expect, it } from "vitest";

import { getOpeningStatus } from "@/lib/activities/opening-hours";

describe("getOpeningStatus", () => {
  it("returns unknown for null/empty input", () => {
    expect(getOpeningStatus(null)).toEqual({ isOpenNow: null, closesAt: null });
    expect(getOpeningStatus("")).toEqual({ isOpenNow: null, closesAt: null });
  });

  it("treats 24/7 as always open with no closing time", () => {
    expect(getOpeningStatus("24/7")).toEqual({ isOpenNow: true, closesAt: null });
  });

  it("detects open within a simple day range", () => {
    const wednesday10am = new Date("2026-07-22T10:00:00"); // a Wednesday
    const status = getOpeningStatus("Mo-Fr 09:00-17:00", wednesday10am);
    expect(status).toEqual({ isOpenNow: true, closesAt: "17:00" });
  });

  it("detects closed outside the day range", () => {
    const sunday10am = new Date("2026-07-26T10:00:00"); // a Sunday
    const status = getOpeningStatus("Mo-Fr 09:00-17:00", sunday10am);
    expect(status).toEqual({ isOpenNow: false, closesAt: null });
  });

  it("detects closed outside the time range on an open day", () => {
    const wednesday8pm = new Date("2026-07-22T20:00:00");
    const status = getOpeningStatus("Mo-Fr 09:00-17:00", wednesday8pm);
    expect(status).toEqual({ isOpenNow: false, closesAt: null });
  });

  it("handles multiple day groups separated by semicolons", () => {
    const saturdayNoon = new Date("2026-07-25T12:00:00"); // a Saturday
    const status = getOpeningStatus("Mo-Fr 09:00-17:00; Sa 10:00-14:00", saturdayNoon);
    expect(status).toEqual({ isOpenNow: true, closesAt: "14:00" });
  });

  it("handles overnight ranges crossing midnight", () => {
    const lateNight = new Date("2026-07-24T01:00:00"); // early Friday, after Thu 18:00-02:00 opened
    const status = getOpeningStatus("Th 18:00-02:00", lateNight);
    expect(status).toEqual({ isOpenNow: true, closesAt: "02:00" });
  });

  it("returns unknown for unsupported syntax rather than guessing", () => {
    expect(getOpeningStatus("Mo-Fr sunset-02:00")).toEqual({ isOpenNow: null, closesAt: null });
    expect(getOpeningStatus("PH off")).toEqual({ isOpenNow: null, closesAt: null });
  });
});
