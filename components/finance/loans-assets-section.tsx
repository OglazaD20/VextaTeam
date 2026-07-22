"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, TrendingUpIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { createAsset, createLoan, deleteAsset, deleteLoan } from "@/app/(app)/finance/actions";
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
import type { AssetType, Tables } from "@/types/database";

function AddLoanDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createLoan({
        name: String(formData.get("name")),
        principalAmount: Number(formData.get("principalAmount")),
        remainingBalance: Number(formData.get("remainingBalance")),
        interestRatePct: formData.get("interestRatePct") ? Number(formData.get("interestRatePct")) : undefined,
        monthlyPayment: formData.get("monthlyPayment") ? Number(formData.get("monthlyPayment")) : undefined,
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that loan", { description: result.error });
        return;
      }
      toast.success("Loan added");
      (event.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Add loan
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loan-name">Name</Label>
            <Input id="loan-name" name="name" placeholder="Car loan, mortgage…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loan-principal">Principal</Label>
              <Input id="loan-principal" name="principalAmount" type="number" min={0.01} step="0.01" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loan-balance">Remaining balance</Label>
              <Input id="loan-balance" name="remainingBalance" type="number" min={0} step="0.01" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loan-rate">Interest rate % (optional)</Label>
              <Input id="loan-rate" name="interestRatePct" type="number" min={0} step="0.01" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loan-payment">Monthly payment (optional)</Label>
              <Input id="loan-payment" name="monthlyPayment" type="number" min={0} step="0.01" />
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

function AddAssetDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [assetType, setAssetType] = React.useState<AssetType>("savings");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAsset({
        name: String(formData.get("name")),
        assetType,
        currentValue: Number(formData.get("currentValue")),
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't add that asset", { description: result.error });
        return;
      }
      toast.success("Asset added");
      (event.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Add asset
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add an asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" name="name" placeholder="Savings account, brokerage…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-type">Type</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger id="asset-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-value">Current value</Label>
              <Input id="asset-value" name="currentValue" type="number" min={0} step="0.01" required />
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

export function LoansAssetsSection({
  loans,
  assets,
}: {
  loans: Tables<"finance_loans">[];
  assets: Tables<"finance_assets">[];
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDeleteLoan(id: string) {
    setPendingId(id);
    const result = await deleteLoan(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't remove that loan", { description: result.error });
  }

  async function handleDeleteAsset(id: string) {
    setPendingId(id);
    const result = await deleteAsset(id);
    setPendingId(null);
    if (result.error) toast.error("Couldn't remove that asset", { description: result.error });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Loans</h3>
          <AddLoanDialog />
        </div>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No loans tracked.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {loans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{loan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {loan.remaining_balance} remaining of {loan.principal_amount}
                    {loan.monthly_payment ? ` · ${loan.monthly_payment}/mo` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => handleDeleteLoan(loan.id)}
                  disabled={pendingId === loan.id}
                  aria-label="Delete loan"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Assets</h3>
          <AddAssetDialog />
        </div>
        {assets.length === 0 ? (
          <EmptyState
            icon={TrendingUpIcon}
            title="No assets tracked"
            description="Add savings, investments, or property to see your net worth."
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{asset.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{asset.asset_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {asset.current_value} {asset.currency}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => handleDeleteAsset(asset.id)}
                    disabled={pendingId === asset.id}
                    aria-label="Delete asset"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
