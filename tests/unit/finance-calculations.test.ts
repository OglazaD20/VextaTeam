import { describe, expect, it } from "vitest";

import {
  computeBudgetUsage,
  computeCashFlow,
  computeMonthlySubscriptionCost,
  computeNetWorth,
  computeSpendingByCategory,
  projectMonthEndSpend,
} from "@/lib/finance/calculations";

describe("computeCashFlow", () => {
  it("sums income and expenses separately and nets them", () => {
    const result = computeCashFlow([
      { type: "income", amount: 3000, category: "salary", occurredAt: "2026-01-01" },
      { type: "expense", amount: 1200, category: "bills", occurredAt: "2026-01-02" },
      { type: "expense", amount: 300, category: "food", occurredAt: "2026-01-03" },
    ]);
    expect(result).toEqual({ income: 3000, expenses: 1500, net: 1500 });
  });

  it("handles no transactions", () => {
    expect(computeCashFlow([])).toEqual({ income: 0, expenses: 0, net: 0 });
  });
});

describe("computeSpendingByCategory", () => {
  it("groups expenses by category, ignoring income", () => {
    const result = computeSpendingByCategory([
      { type: "expense", amount: 50, category: "food", occurredAt: "2026-01-01" },
      { type: "expense", amount: 30, category: "food", occurredAt: "2026-01-02" },
      { type: "income", amount: 1000, category: "salary", occurredAt: "2026-01-01" },
    ]);
    expect(result).toEqual({ food: 80 });
  });
});

describe("computeNetWorth", () => {
  it("subtracts total debt from total assets", () => {
    expect(computeNetWorth({ assetValues: [10000, 5000], loanBalances: [3000] })).toBe(12000);
  });

  it("can be negative", () => {
    expect(computeNetWorth({ assetValues: [1000], loanBalances: [5000] })).toBe(-4000);
  });
});

describe("computeBudgetUsage", () => {
  it("flags over-budget categories", () => {
    const [result] = computeBudgetUsage([{ category: "food", monthlyLimit: 300 }], { food: 350 });
    expect(result.isOverBudget).toBe(true);
    expect(result.remaining).toBe(-50);
    expect(result.pctUsed).toBeGreaterThan(100);
  });

  it("computes remaining budget when under limit", () => {
    const [result] = computeBudgetUsage([{ category: "food", monthlyLimit: 300 }], { food: 100 });
    expect(result.isOverBudget).toBe(false);
    expect(result.remaining).toBe(200);
    expect(result.pctUsed).toBe(33);
  });
});

describe("projectMonthEndSpend", () => {
  it("projects linearly from the daily average pace", () => {
    expect(projectMonthEndSpend(300, 10, 30)).toBe(900);
  });

  it("returns spent-so-far when day 0", () => {
    expect(projectMonthEndSpend(0, 0, 30)).toBe(0);
  });
});

describe("computeMonthlySubscriptionCost", () => {
  it("normalizes weekly/monthly/yearly to a monthly equivalent", () => {
    const result = computeMonthlySubscriptionCost([
      { amount: 10, billingCycle: "monthly" },
      { amount: 120, billingCycle: "yearly" },
      { amount: 5, billingCycle: "weekly" },
    ]);
    // 10 + 10 + (5 * 52/12 ≈ 21.67) ≈ 41.67
    expect(result.monthlyEquivalent).toBeCloseTo(41.67, 1);
  });
});
