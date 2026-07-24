"use client";

import type { FinanceDashboardData, MonthlyTrendPoint } from "@/app/(app)/finance/actions";
import { AddTransactionDialog } from "@/components/finance/add-transaction-dialog";
import { BudgetsSection } from "@/components/finance/budgets-section";
import { FinanceInsightsPanel } from "@/components/finance/finance-insights-panel";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { LoansAssetsSection } from "@/components/finance/loans-assets-section";
import { SubscriptionsSection } from "@/components/finance/subscriptions-section";
import { TransactionList } from "@/components/finance/transaction-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FinanceClient({
  dashboard,
  trend,
}: {
  dashboard: FinanceDashboardData;
  trend: MonthlyTrendPoint[];
}) {
  const currency = dashboard.settings?.currency ?? "EUR";

  return (
    <Tabs defaultValue="overview" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="net-worth">Loans & Assets</TabsTrigger>
        </TabsList>
        <AddTransactionDialog />
      </div>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <FinanceInsightsPanel />
        <FinanceOverview dashboard={dashboard} trend={trend} />
      </TabsContent>

      <TabsContent value="transactions">
        <TransactionList transactions={dashboard.transactions} currency={currency} />
      </TabsContent>

      <TabsContent value="subscriptions">
        <SubscriptionsSection subscriptions={dashboard.subscriptions} />
      </TabsContent>

      <TabsContent value="budgets">
        <BudgetsSection budgets={dashboard.budgets} />
      </TabsContent>

      <TabsContent value="net-worth">
        <LoansAssetsSection loans={dashboard.loans} assets={dashboard.assets} />
      </TabsContent>
    </Tabs>
  );
}
