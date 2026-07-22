"use client";

import type { FinanceDashboardData, MonthlyTrendPoint } from "@/app/(app)/finance/actions";
import { FinanceTrendChart } from "@/components/finance/finance-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORY_ICON, EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/finance/categories";
import { cn } from "@/lib/utils";

function money(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-xl font-semibold",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

export function FinanceOverview({
  dashboard,
  trend,
}: {
  dashboard: FinanceDashboardData;
  trend: MonthlyTrendPoint[];
}) {
  const currency = dashboard.settings?.currency ?? "EUR";
  const categoryEntries = Object.entries(dashboard.spendingByCategory).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Income" value={money(dashboard.cashFlow.income, currency)} tone="positive" />
        <SummaryCard label="Expenses" value={money(dashboard.cashFlow.expenses, currency)} tone="negative" />
        <SummaryCard
          label="Net this month"
          value={money(dashboard.cashFlow.net, currency)}
          tone={dashboard.cashFlow.net >= 0 ? "positive" : "negative"}
        />
        <SummaryCard label="Net worth" value={money(dashboard.netWorth, currency)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income vs expenses — last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceTrendChart points={trend} currency={currency} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses logged this month yet.</p>
            ) : (
              categoryEntries.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span>{EXPENSE_CATEGORY_ICON[category as ExpenseCategory] ?? "📦"}</span>
                    {EXPENSE_CATEGORY_LABEL[category as ExpenseCategory] ?? category}
                  </span>
                  <span className="text-muted-foreground">{money(amount, currency)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budgets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dashboard.budgetUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No budgets set yet.</p>
            ) : (
              dashboard.budgetUsage.map((b) => (
                <div key={b.category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{EXPENSE_CATEGORY_LABEL[b.category as ExpenseCategory] ?? b.category}</span>
                    <span className={cn("text-muted-foreground", b.isOverBudget && "text-destructive")}>
                      {money(b.spent, currency)} / {money(b.limit, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", b.isOverBudget ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${Math.min(100, b.pctUsed)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6 text-sm">
          <span className="text-muted-foreground">Monthly subscriptions</span>
          <span className="font-medium">{money(dashboard.monthlySubscriptionCost, currency)}/mo</span>
          <span className="text-muted-foreground">Projected month-end spend</span>
          <span className="font-medium">{money(dashboard.projectedMonthEndSpend, currency)}</span>
        </CardContent>
      </Card>
    </div>
  );
}
