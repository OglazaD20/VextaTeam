"use client";

import * as React from "react";
import { ReceiptTextIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteTransaction } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  EXPENSE_CATEGORY_ICON,
  EXPENSE_CATEGORY_LABEL,
  INCOME_CATEGORY_LABEL,
  type ExpenseCategory,
  type IncomeCategory,
} from "@/lib/finance/categories";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

function categoryLabel(type: "income" | "expense", category: string): string {
  if (type === "income") return INCOME_CATEGORY_LABEL[category as IncomeCategory] ?? category;
  return EXPENSE_CATEGORY_LABEL[category as ExpenseCategory] ?? category;
}

export function TransactionList({ transactions, currency }: { transactions: Tables<"transactions">[]; currency: string }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    const result = await deleteTransaction(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't delete that transaction", { description: result.error });
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ReceiptTextIcon}
        title="No transactions this month"
        description="Add an expense or income to start tracking your cash flow."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {transactions.map((tx) => (
        <div key={tx.id} className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2">
          <span className="text-lg">
            {tx.type === "expense" ? EXPENSE_CATEGORY_ICON[tx.category as ExpenseCategory] ?? "📦" : "💵"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tx.description || categoryLabel(tx.type, tx.category)}</p>
            <p className="text-xs text-muted-foreground">
              {categoryLabel(tx.type, tx.category)} ·{" "}
              {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                new Date(tx.occurred_at),
              )}
            </p>
          </div>
          <span className={cn("shrink-0 font-medium", tx.type === "income" ? "text-success" : "text-destructive")}>
            {tx.type === "income" ? "+" : "-"}
            {tx.amount} {currency}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => handleDelete(tx.id)}
            disabled={pendingId === tx.id}
            aria-label="Delete transaction"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
