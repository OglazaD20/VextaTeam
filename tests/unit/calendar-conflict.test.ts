import { describe, expect, it } from "vitest";

import { resolveConflict } from "@/lib/calendar/conflict";

const baseline = new Date("2026-07-20T10:00:00Z");

describe("resolveConflict", () => {
  it("reports no_change when neither side moved since the baseline", () => {
    const result = resolveConflict({
      localUpdatedAt: baseline,
      externalUpdatedAt: baseline,
      remoteUpdatedAt: baseline,
    });
    expect(result).toBe("no_change");
  });

  it("uses remote when only Google changed", () => {
    const result = resolveConflict({
      localUpdatedAt: baseline,
      externalUpdatedAt: baseline,
      remoteUpdatedAt: new Date("2026-07-20T11:00:00Z"),
    });
    expect(result).toBe("use_remote");
  });

  it("uses local when only the local copy changed", () => {
    const result = resolveConflict({
      localUpdatedAt: new Date("2026-07-20T11:00:00Z"),
      externalUpdatedAt: baseline,
      remoteUpdatedAt: baseline,
    });
    expect(result).toBe("use_local");
  });

  it("picks whichever side is newer when both changed", () => {
    const bothChanged = {
      externalUpdatedAt: baseline,
      localUpdatedAt: new Date("2026-07-20T11:00:00Z"),
      remoteUpdatedAt: new Date("2026-07-20T12:00:00Z"),
    };
    expect(resolveConflict(bothChanged)).toBe("use_remote");

    const localNewer = {
      externalUpdatedAt: baseline,
      localUpdatedAt: new Date("2026-07-20T13:00:00Z"),
      remoteUpdatedAt: new Date("2026-07-20T12:00:00Z"),
    };
    expect(resolveConflict(localNewer)).toBe("use_local");
  });

  it("treats a never-synced item's baseline as the epoch", () => {
    const result = resolveConflict({
      localUpdatedAt: new Date("2020-01-01T00:00:00Z"),
      externalUpdatedAt: null,
      remoteUpdatedAt: new Date("2020-01-01T00:00:00Z"),
    });
    expect(result).toBe("use_remote");
  });

  it("ignores sub-tolerance differences (clock skew / same-transaction writes)", () => {
    const result = resolveConflict({
      localUpdatedAt: new Date(baseline.getTime() + 1000),
      externalUpdatedAt: baseline,
      remoteUpdatedAt: new Date(baseline.getTime() + 1200),
    });
    expect(result).toBe("no_change");
  });
});
