import { describe, expect, it } from "vitest";

import { computeNextReview, type SpacedRepetitionState } from "@/lib/learning/spaced-repetition";

const initial: SpacedRepetitionState = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

describe("computeNextReview", () => {
  it("schedules the first successful review 1 day out", () => {
    const result = computeNextReview(initial, 4);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
  });

  it("schedules the second successful review 6 days out", () => {
    const afterFirst = computeNextReview(initial, 4);
    const afterSecond = computeNextReview(afterFirst, 4);
    expect(afterSecond.repetitions).toBe(2);
    expect(afterSecond.intervalDays).toBe(6);
  });

  it("grows the interval on subsequent successful reviews", () => {
    let state = computeNextReview(initial, 4);
    state = computeNextReview(state, 4);
    const third = computeNextReview(state, 4);
    expect(third.repetitions).toBe(3);
    expect(third.intervalDays).toBeGreaterThan(6);
  });

  it("resets to a 1-day interval on a failed recall (quality < 3)", () => {
    let state = computeNextReview(initial, 4);
    state = computeNextReview(state, 4);
    const failed = computeNextReview(state, 1);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
  });

  it("lowers ease factor for a mediocre-but-passing recall", () => {
    const result = computeNextReview(initial, 3);
    expect(result.easeFactor).toBeLessThan(initial.easeFactor);
  });

  it("never drops ease factor below 1.3", () => {
    let state = initial;
    for (let i = 0; i < 20; i++) {
      state = computeNextReview(state, 3);
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("computes dueAt consistent with intervalDays", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = computeNextReview(initial, 4, now);
    expect(result.dueAt.getTime() - now.getTime()).toBe(result.intervalDays * 86_400_000);
  });
});
