"use server";

import { revalidatePath } from "next/cache";

import { extractReceiptData, type ExtractedReceipt } from "@/lib/ai/extract-receipt";
import {
  computeBudgetUsage,
  computeCashFlow,
  computeMonthlySubscriptionCost,
  computeNetWorth,
  computeSpendingByCategory,
  projectMonthEndSpend,
} from "@/lib/finance/calculations";
import { deleteMemoryForSource, recordMemory } from "@/lib/memory/upsert";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  createAssetSchema,
  createBudgetSchema,
  createLoanSchema,
  createSubscriptionSchema,
  createTransactionSchema,
  updateFinanceSettingsSchema,
  type CreateAssetInput,
  type CreateBudgetInput,
  type CreateLoanInput,
  type CreateSubscriptionInput,
  type CreateTransactionInput,
  type UpdateFinanceSettingsInput,
} from "./schema";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}

function revalidateFinance() {
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

// ---------- Transactions ----------

export async function createTransaction(input: CreateTransactionInput): Promise<ActionResult> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description ?? null,
      occurred_at: data.occurredAt,
      receipt_storage_path: data.receiptStoragePath ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Only transactions with a description become memories — a bare "€4.50
  // food expense" isn't recallable, but "Birthday gift for mom" is exactly
  // what "what gift ideas did I save?" style queries are about.
  if (inserted && data.description) {
    await recordMemory(supabase, {
      userId: user.id,
      sourceType: "finance",
      sourceId: inserted.id,
      title: data.description,
      content: `${data.type === "income" ? "Received" : "Spent"} ${data.amount} on ${data.category}: ${data.description}`,
      category: data.category,
      occurredAt: data.occurredAt,
    });
  }

  revalidateFinance();
  return {};
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("transactions")
    .select("receipt_storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  if (existing?.receipt_storage_path) {
    await supabase.storage.from("receipt-images").remove([existing.receipt_storage_path]);
  }

  await deleteMemoryForSource(supabase, user.id, "finance", id);
  revalidateFinance();
  return {};
}

// ---------- Subscriptions ----------

export async function createSubscription(input: CreateSubscriptionInput): Promise<ActionResult> {
  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase.from("finance_subscriptions").insert({
    user_id: user.id,
    name: data.name,
    amount: data.amount,
    billing_cycle: data.billingCycle,
    category: data.category,
    next_billing_date: data.nextBillingDate ?? null,
    notes: data.notes ?? null,
  });

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function toggleSubscriptionActive(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: sub } = await supabase
    .from("finance_subscriptions")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!sub) return { error: "Subscription not found" };

  const { error } = await supabase
    .from("finance_subscriptions")
    .update({ is_active: !sub.is_active })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("finance_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

// ---------- Budgets ----------

export async function upsertBudget(input: CreateBudgetInput): Promise<ActionResult> {
  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase
    .from("finance_budgets")
    .upsert(
      { user_id: user.id, category: data.category, monthly_limit: data.monthlyLimit },
      { onConflict: "user_id,category" },
    );

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("finance_budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

// ---------- Loans ----------

export async function createLoan(input: CreateLoanInput): Promise<ActionResult> {
  const parsed = createLoanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase.from("finance_loans").insert({
    user_id: user.id,
    name: data.name,
    principal_amount: data.principalAmount,
    remaining_balance: data.remainingBalance,
    interest_rate_pct: data.interestRatePct ?? null,
    monthly_payment: data.monthlyPayment ?? null,
    start_date: data.startDate ?? null,
    notes: data.notes ?? null,
  });

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function deleteLoan(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("finance_loans").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

// ---------- Assets ----------

export async function createAsset(input: CreateAssetInput): Promise<ActionResult> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase.from("finance_assets").insert({
    user_id: user.id,
    name: data.name,
    asset_type: data.assetType,
    current_value: data.currentValue,
    notes: data.notes ?? null,
  });

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function updateAssetValue(id: string, currentValue: number): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("finance_assets")
    .update({ current_value: currentValue })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("finance_assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

// ---------- Settings ----------

export async function getFinanceSettings(): Promise<ActionResult<Tables<"finance_settings"> | null>> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("finance_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data };
}

export async function updateFinanceSettings(input: UpdateFinanceSettingsInput): Promise<ActionResult> {
  const parsed = updateFinanceSettingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase.from("finance_settings").upsert(
    {
      user_id: user.id,
      currency: data.currency,
      monthly_income_estimate: data.monthlyIncomeEstimate ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  revalidateFinance();
  return {};
}

// ---------- Receipt OCR ----------

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export async function scanReceipt(
  formData: FormData,
): Promise<ActionResult<{ extracted: ExtractedReceipt; storagePath: string }>> {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided" };
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return { error: "Image is larger than 10MB" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;

  let extracted: ExtractedReceipt;
  try {
    extracted = await extractReceiptData(dataUrl);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't read that receipt" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("receipt-images")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return { data: { extracted, storagePath } };
}

export interface MonthlyTrendPoint {
  monthKey: string;
  income: number;
  expenses: number;
}

/** Income/expense totals for each of the trailing N months (chart data). */
export async function getMonthlyTrend(months = 6): Promise<ActionResult<MonthlyTrendPoint[]>> {
  const { supabase, user } = await requireUser();

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, occurred_at")
    .eq("user_id", user.id)
    .gte("occurred_at", rangeStart.toISOString());

  if (error) return { error: error.message };

  const points: MonthlyTrendPoint[] = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, income: 0, expenses: 0 };
  });
  const byMonth = new Map(points.map((p) => [p.monthKey, p]));

  for (const t of data ?? []) {
    const d = new Date(t.occurred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = byMonth.get(key);
    if (!point) continue;
    if (t.type === "income") point.income = Math.round((point.income + t.amount) * 100) / 100;
    else point.expenses = Math.round((point.expenses + t.amount) * 100) / 100;
  }

  return { data: points };
}

// ---------- Dashboard ----------

export interface FinanceDashboardData {
  transactions: Tables<"transactions">[];
  subscriptions: Tables<"finance_subscriptions">[];
  budgets: Tables<"finance_budgets">[];
  loans: Tables<"finance_loans">[];
  assets: Tables<"finance_assets">[];
  settings: Tables<"finance_settings"> | null;
  cashFlow: ReturnType<typeof computeCashFlow>;
  spendingByCategory: ReturnType<typeof computeSpendingByCategory>;
  budgetUsage: ReturnType<typeof computeBudgetUsage>;
  netWorth: number;
  monthlySubscriptionCost: number;
  projectedMonthEndSpend: number;
}

export async function getFinanceDashboard(): Promise<ActionResult<FinanceDashboardData>> {
  const { supabase, user } = await requireUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();

  const [
    { data: transactions, error: txError },
    { data: subscriptions, error: subError },
    { data: budgets, error: budgetError },
    { data: loans, error: loanError },
    { data: assets, error: assetError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("occurred_at", monthStart.toISOString())
      .lte("occurred_at", monthEnd.toISOString())
      .order("occurred_at", { ascending: false }),
    supabase.from("finance_subscriptions").select("*").eq("user_id", user.id).order("amount", { ascending: false }),
    supabase.from("finance_budgets").select("*").eq("user_id", user.id),
    supabase.from("finance_loans").select("*").eq("user_id", user.id),
    supabase.from("finance_assets").select("*").eq("user_id", user.id),
    supabase.from("finance_settings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const err = txError ?? subError ?? budgetError ?? loanError ?? assetError ?? settingsError;
  if (err) return { error: err.message };

  const txRecords = (transactions ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    occurredAt: t.occurred_at,
  }));

  const cashFlow = computeCashFlow(txRecords);
  const spendingByCategory = computeSpendingByCategory(txRecords);
  const budgetUsage = computeBudgetUsage(
    (budgets ?? []).map((b) => ({ category: b.category, monthlyLimit: b.monthly_limit })),
    spendingByCategory,
  );
  const netWorth = computeNetWorth({
    assetValues: (assets ?? []).map((a) => a.current_value),
    loanBalances: (loans ?? []).map((l) => l.remaining_balance),
  });
  const monthlySubscriptionCost = computeMonthlySubscriptionCost(
    (subscriptions ?? [])
      .filter((s) => s.is_active)
      .map((s) => ({ amount: s.amount, billingCycle: s.billing_cycle })),
  ).monthlyEquivalent;
  const projectedMonthEndSpend = projectMonthEndSpend(cashFlow.expenses, dayOfMonth, daysInMonth);

  return {
    data: {
      transactions: transactions ?? [],
      subscriptions: subscriptions ?? [],
      budgets: budgets ?? [],
      loans: loans ?? [],
      assets: assets ?? [],
      settings,
      cashFlow,
      spendingByCategory,
      budgetUsage,
      netWorth,
      monthlySubscriptionCost,
      projectedMonthEndSpend,
    },
  };
}
