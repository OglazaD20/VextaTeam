"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, Trash2Icon, WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { deleteBudget, upsertBudget } from "@/app/(app)/finance/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/finance/categories";
import type { Tables } from "@/types/database";

function SetBudgetDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [category, setCategory] = React.useState<ExpenseCategory>("food");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await upsertBudget({
        category,
        monthlyLimit: Number(formData.get("monthlyLimit")),
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't save that budget", { description: result.error });
        return;
      }
      toast.success("Budget saved");
      (event.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Set a budget
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set a monthly budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger id="budget-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-limit">Monthly limit</Label>
            <Input id="budget-limit" name="monthlyLimit" type="number" min={1} step="0.01" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetsSection({ budgets }: { budgets: Tables<"finance_budgets">[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setPendingId(id);
    const result = await deleteBudget(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't remove that budget", { description: result.error });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <SetBudgetDialog />
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="No budgets set"
          description="Set a monthly limit per category and LifeFlow tracks your progress automatically."
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {budgets.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-sm">
                {EXPENSE_CATEGORY_LABEL[b.category as ExpenseCategory] ?? b.category}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{b.monthly_limit}/mo</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => handleDelete(b.id)}
                  disabled={pendingId === b.id}
                  aria-label="Delete budget"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
