"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, RepeatIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { createSubscription, deleteSubscription, toggleSubscriptionActive } from "@/app/(app)/finance/actions";
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
import { Switch } from "@/components/ui/switch";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/finance/categories";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

function AddSubscriptionDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [billingCycle, setBillingCycle] = React.useState<"weekly" | "monthly" | "yearly">("monthly");
  const [category, setCategory] = React.useState<ExpenseCategory>("bills");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createSubscription({
        name: String(formData.get("name")),
        amount: Number(formData.get("amount")),
        billingCycle,
        category,
        nextBillingDate: (formData.get("nextBillingDate") as string) || undefined,
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that subscription", { description: result.error });
        return;
      }
      toast.success("Subscription added");
      (event.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Add subscription
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-name">Name</Label>
            <Input id="sub-name" name="name" placeholder="Netflix, Spotify…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-amount">Amount</Label>
              <Input id="sub-amount" name="amount" type="number" min={0.01} step="0.01" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-cycle">Billing cycle</Label>
              <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as typeof billingCycle)}>
                <SelectTrigger id="sub-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger id="sub-category">
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
              <Label htmlFor="sub-next">Next billing (optional)</Label>
              <Input id="sub-next" name="nextBillingDate" type="date" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionsSection({ subscriptions }: { subscriptions: Tables<"finance_subscriptions">[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleToggle(id: string) {
    setPendingId(id);
    const result = await toggleSubscriptionActive(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't update that subscription", { description: result.error });
  }

  async function handleDelete(id: string) {
    setPendingId(id);
    const result = await deleteSubscription(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't remove that subscription", { description: result.error });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddSubscriptionDialog />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={RepeatIcon}
          title="No subscriptions tracked"
          description="Add recurring payments so LifeFlow can total them and flag ones you might've forgotten."
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <div className={cn("min-w-0 flex-1", !sub.is_active && "opacity-50")}>
                <p className="truncate text-sm font-medium">{sub.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.amount} {sub.currency} / {sub.billing_cycle}
                  {sub.next_billing_date &&
                    ` · next ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(sub.next_billing_date))}`}
                </p>
              </div>
              <Switch checked={sub.is_active} onCheckedChange={() => handleToggle(sub.id)} disabled={pendingId === sub.id} />
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={() => handleDelete(sub.id)}
                disabled={pendingId === sub.id}
                aria-label="Delete subscription"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
