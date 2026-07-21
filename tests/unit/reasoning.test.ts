import { describe, expect, it } from "vitest";

import {
  computePlacementFacts,
  getProductiveWindow,
  notablePlacementFacts,
} from "@/lib/scheduling/reasoning";

const TZ = "UTC";

function at(hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 6, 20, hour, minute));
}

describe("getProductiveWindow", () => {
  it("returns morning hours for early_bird", () => {
    expect(getProductiveWindow("early_bird")).toEqual([6, 11]);
  });

  it("returns afternoon/evening hours for night_owl", () => {
    expect(getProductiveWindow("night_owl")).toEqual([15, 21]);
  });

  it("returns a mid-morning default for flexible", () => {
    expect(getProductiveWindow("flexible")).toEqual([9, 12]);
  });
});

describe("computePlacementFacts", () => {
  it("flags a placement inside the chronotype's productive window", () => {
    const facts = computePlacementFacts(
      [{ id: "1", start: at(9, 30), end: at(10, 30) }],
      [],
      new Map([["1", { id: "1", title: "Deep work" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].isDuringProductiveWindow).toBe(true);
  });

  it("does not flag a placement outside the productive window", () => {
    const facts = computePlacementFacts(
      [{ id: "1", start: at(20, 0), end: at(21, 0) }],
      [],
      new Map([["1", { id: "1", title: "Laundry" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].isDuringProductiveWindow).toBe(false);
  });

  it("flags a placement adjacent to a fixed item and names it", () => {
    const fixed = [{ id: "f1", title: "Team standup", start: at(13, 0), end: at(14, 0) }];
    const facts = computePlacementFacts(
      [{ id: "1", start: at(14, 5), end: at(15, 0) }],
      fixed,
      new Map([["1", { id: "1", title: "Follow-up email" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].adjacentFixedTitle).toBe("Team standup");
  });

  it("does not flag a placement far from any fixed item", () => {
    const fixed = [{ id: "f1", title: "Team standup", start: at(13, 0), end: at(14, 0) }];
    const facts = computePlacementFacts(
      [{ id: "1", start: at(17, 0), end: at(18, 0) }],
      fixed,
      new Map([["1", { id: "1", title: "Reading" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].adjacentFixedTitle).toBeNull();
  });

  it("flags a habit scheduled at its preferred time", () => {
    const facts = computePlacementFacts(
      [{ id: "1", start: at(7, 5), end: at(7, 35) }],
      [],
      new Map([["1", { id: "1", title: "Morning run", habitPreferredTime: "07:00" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].isHabitAtPreferredTime).toBe(true);
  });

  it("does not flag a habit scheduled well outside its preferred time", () => {
    const facts = computePlacementFacts(
      [{ id: "1", start: at(20, 0), end: at(20, 30) }],
      [],
      new Map([["1", { id: "1", title: "Morning run", habitPreferredTime: "07:00" }]]),
      "flexible",
      TZ,
    );
    expect(facts[0].isHabitAtPreferredTime).toBe(false);
  });
});

describe("notablePlacementFacts", () => {
  it("filters out facts with nothing notable", () => {
    const facts = [
      {
        id: "1",
        title: "Routine task",
        isDuringProductiveWindow: false,
        adjacentFixedTitle: null,
        isHabitAtPreferredTime: false,
      },
      {
        id: "2",
        title: "Deep work",
        isDuringProductiveWindow: true,
        adjacentFixedTitle: null,
        isHabitAtPreferredTime: false,
      },
    ];
    expect(notablePlacementFacts(facts)).toHaveLength(1);
    expect(notablePlacementFacts(facts)[0].id).toBe("2");
  });
});
