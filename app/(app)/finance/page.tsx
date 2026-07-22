import type { Metadata } from "next";

import { getFinanceDashboard, getMonthlyTrend } from "@/app/(app)/finance/actions";
import { FinanceClient } from "@/components/finance/finance-client";

export const metadata: Metadata = { title: "Finance — LifeFlow" };

export default async function FinancePage() {
  const [dashboardResult, trendResult] = await Promise.all([getFinanceDashboard(), getMonthlyTrend(6)]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Finance</h1>
        <p className="text-sm text-muted-foreground">Income, expenses, budgets, and net worth.</p>
      </div>

      {dashboardResult.error ? (
        <p className="text-sm text-destructive">{dashboardResult.error}</p>
      ) : (
        <FinanceClient dashboard={dashboardResult.data!} trend={trendResult.data ?? []} />
      )}
    </div>
  );
}
