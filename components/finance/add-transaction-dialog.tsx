"use client";

import * as React from "react";
import { CameraIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createTransaction, scanReceipt } from "@/app/(app)/finance/actions";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  INCOME_CATEGORIES,
  INCOME_CATEGORY_LABEL,
} from "@/lib/finance/categories";

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AddTransactionDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isScanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"expense" | "income">("expense");
  const [category, setCategory] = React.useState<string>("food");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(nowLocal);
  const [receiptStoragePath, setReceiptStoragePath] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setType("expense");
    setCategory("food");
    setAmount("");
    setDescription("");
    setOccurredAt(nowLocal());
    setReceiptStoragePath(null);
    setError(null);
  }

  async function handleScan(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setScanning(true);
    const formData = new FormData();
    formData.set("file", file);

    const result = await scanReceipt(formData);
    setScanning(false);

    if (result.error) {
      toast.error("Couldn't read that receipt", { description: result.error });
      return;
    }

    const { extracted, storagePath } = result.data!;
    setType("expense");
    if (extracted.totalAmount !== null) setAmount(String(extracted.totalAmount));
    if (extracted.suggestedCategory) setCategory(extracted.suggestedCategory);
    if (extracted.merchantName) setDescription(extracted.merchantName);
    setReceiptStoragePath(storagePath);
    toast.success("Receipt scanned — review before saving");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createTransaction({
        type,
        amount: Number(amount),
        category,
        description: description || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
        receiptStoragePath: receiptStoragePath ?? undefined,
      });
      if (result.error) {
        setError(result.error);
        toast.error("Couldn't save that transaction", { description: result.error });
        return;
      }
      toast.success("Transaction added");
      reset();
      setOpen(false);
    });
  }

  const categoryOptions = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categoryLabels = type === "expense" ? EXPENSE_CATEGORY_LABEL : INCOME_CATEGORY_LABEL;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) reset();
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> Add transaction
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
            <TabsList className="w-full">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          {type === "expense" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleScan}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? <Loader2Icon className="animate-spin" /> : <CameraIcon className="size-3.5" />}
                Scan a receipt
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="tx-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c as keyof typeof categoryLabels]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-description">Description (optional)</Label>
            <Input
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Grocery run, freelance payment…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending || !amount}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
