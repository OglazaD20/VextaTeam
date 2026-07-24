import { describe, expect, it } from "vitest";

import { evaluateCondition, evaluateConditionGroups, type AutomationContext } from "@/lib/automations/conditions";

function ctx(overrides: Partial<AutomationContext> = {}): AutomationContext {
  return { dayOfWeek: 1, timeOfDayMinutes: 9 * 60, ...overrides };
}

describe("evaluateCondition", () => {
  it("task_priority_at_least is true only when the real task's priority meets the bar", () => {
    expect(evaluateCondition({ type: "task_priority_at_least", value: 3 }, ctx({ task: { priority: 3, category: null } }))).toBe(true);
    expect(evaluateCondition({ type: "task_priority_at_least", value: 3 }, ctx({ task: { priority: 2, category: null } }))).toBe(false);
    expect(evaluateCondition({ type: "task_priority_at_least", value: 3 }, ctx())).toBe(false);
  });

  it("habit_name_is matches case-insensitively against the real habit name", () => {
    expect(evaluateCondition({ type: "habit_name_is", value: "Meditate" }, ctx({ habit: { name: "meditate" } }))).toBe(true);
    expect(evaluateCondition({ type: "habit_name_is", value: "Meditate" }, ctx({ habit: { name: "Run" } }))).toBe(false);
  });

  it("mood_at_most is true only when the real mood is at or below the threshold", () => {
    expect(evaluateCondition({ type: "mood_at_most", value: 2 }, ctx({ mood: { mood: 2 } }))).toBe(true);
    expect(evaluateCondition({ type: "mood_at_most", value: 2 }, ctx({ mood: { mood: 4 } }))).toBe(false);
  });

  it("weather_is_raining never matches when there's no real weather context", () => {
    expect(evaluateCondition({ type: "weather_is_raining", value: 1 }, ctx())).toBe(false);
    expect(evaluateCondition({ type: "weather_is_raining", value: 1 }, ctx({ weather: { isRaining: true } }))).toBe(true);
  });

  it("budget_category_over_pct compares against the real per-category usage", () => {
    const context = ctx({ budgetUsageByCategory: { groceries: 92 } });
    expect(evaluateCondition({ type: "budget_category_over_pct", value: { category: "groceries", pct: 80 } }, context)).toBe(true);
    expect(evaluateCondition({ type: "budget_category_over_pct", value: { category: "groceries", pct: 95 } }, context)).toBe(false);
    expect(evaluateCondition({ type: "budget_category_over_pct", value: { category: "rent", pct: 50 } }, context)).toBe(false);
  });

  it("day_of_week_is and time_of_day_between read from the real evaluation context", () => {
    expect(evaluateCondition({ type: "day_of_week_is", value: 1 }, ctx({ dayOfWeek: 1 }))).toBe(true);
    expect(evaluateCondition({ type: "day_of_week_is", value: 2 }, ctx({ dayOfWeek: 1 }))).toBe(false);
    expect(evaluateCondition({ type: "time_of_day_between", value: [8 * 60, 10 * 60] }, ctx({ timeOfDayMinutes: 9 * 60 }))).toBe(true);
    expect(evaluateCondition({ type: "time_of_day_between", value: [8 * 60, 10 * 60] }, ctx({ timeOfDayMinutes: 11 * 60 }))).toBe(false);
  });
});

describe("evaluateConditionGroups", () => {
  it("always runs when there are no condition groups", () => {
    expect(evaluateConditionGroups([], ctx())).toBe(true);
  });

  it("ANDs conditions within a group", () => {
    const groups = [
      [
        { type: "day_of_week_is" as const, value: 1 },
        { type: "task_priority_at_least" as const, value: 3 },
      ],
    ];
    expect(evaluateConditionGroups(groups, ctx({ dayOfWeek: 1, task: { priority: 3, category: null } }))).toBe(true);
    expect(evaluateConditionGroups(groups, ctx({ dayOfWeek: 2, task: { priority: 3, category: null } }))).toBe(false);
  });

  it("ORs across groups", () => {
    const groups = [
      [{ type: "day_of_week_is" as const, value: 0 }],
      [{ type: "day_of_week_is" as const, value: 6 }],
    ];
    expect(evaluateConditionGroups(groups, ctx({ dayOfWeek: 6 }))).toBe(true);
    expect(evaluateConditionGroups(groups, ctx({ dayOfWeek: 3 }))).toBe(false);
  });
});
