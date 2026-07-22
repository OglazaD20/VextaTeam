export interface TransactionAmount {
  type: "income" | "expense";
  amount: number;
  category: string;
  occurredAt: string;
}

export interface CashFlowSummary {
  income: number;
  expenses: number;
  net: number;
}

export function computeCashFlow(transactions: TransactionAmount[]): CashFlowSummary {
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
  };
}

export function computeSpendingByCategory(transactions: TransactionAmount[]): Record<string, number> {
  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    byCategory[t.category] = Math.round(((byCategory[t.category] ?? 0) + t.amount) * 100) / 100;
  }
  return byCategory;
}

export interface NetWorthInput {
  assetValues: number[];
  loanBalances: number[];
}

export function computeNetWorth(input: NetWorthInput): number {
  const assets = input.assetValues.reduce((a, b) => a + b, 0);
  const debts = input.loanBalances.reduce((a, b) => a + b, 0);
  return Math.round((assets - debts) * 100) / 100;
}

export interface BudgetUsage {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pctUsed: number;
  isOverBudget: boolean;
}

export function computeBudgetUsage(
  budgets: { category: string; monthlyLimit: number }[],
  spendingByCategory: Record<string, number>,
): BudgetUsage[] {
  return budgets.map((b) => {
    const spent = spendingByCategory[b.category] ?? 0;
    const pctUsed = b.monthlyLimit > 0 ? Math.round((spent / b.monthlyLimit) * 100) : 0;
    return {
      category: b.category,
      limit: b.monthlyLimit,
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round((b.monthlyLimit - spent) * 100) / 100,
      pctUsed,
      isOverBudget: spent > b.monthlyLimit,
    };
  });
}

/** Projects month-end spend from the daily average pace so far this month. */
export function projectMonthEndSpend(
  spentSoFar: number,
  dayOfMonth: number,
  daysInMonth: number,
): number {
  if (dayOfMonth <= 0) return spentSoFar;
  const dailyAvg = spentSoFar / dayOfMonth;
  return Math.round(dailyAvg * daysInMonth * 100) / 100;
}

export interface MonthlySubscriptionCost {
  monthlyEquivalent: number;
}

/** Normalizes a subscription's billing cycle to a monthly-equivalent cost. */
export function computeMonthlySubscriptionCost(
  subscriptions: { amount: number; billingCycle: "weekly" | "monthly" | "yearly" }[],
): MonthlySubscriptionCost {
  const total = subscriptions.reduce((sum, s) => {
    if (s.billingCycle === "weekly") return sum + s.amount * (52 / 12);
    if (s.billingCycle === "yearly") return sum + s.amount / 12;
    return sum + s.amount;
  }, 0);
  return { monthlyEquivalent: Math.round(total * 100) / 100 };
}
