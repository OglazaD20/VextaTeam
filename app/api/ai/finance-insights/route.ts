import { NextResponse } from "next/server";

import { generateFinanceInsights, type FinanceInsightSignals } from "@/lib/ai/generate-finance-insights";
import { getLocale } from "@/lib/i18n/get-locale";
import {
  computeBudgetUsage,
  computeCashFlow,
  computeMonthlySubscriptionCost,
  computeNetWorth,
  computeSpendingByCategory,
  projectMonthEndSpend,
} from "@/lib/finance/calculations";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("finance_insights")
    .select("headline, insights, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();

  const [
    { data: thisMonthTx, error: txError },
    { data: lastMonthTx, error: lastTxError },
    { data: budgets, error: budgetError },
    { data: subscriptions, error: subError },
    { data: loans, error: loanError },
    { data: assets, error: assetError },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, category, occurred_at")
      .eq("user_id", user.id)
      .gte("occurred_at", monthStart.toISOString())
      .lte("occurred_at", monthEnd.toISOString()),
    supabase
      .from("transactions")
      .select("type, amount, category, occurred_at")
      .eq("user_id", user.id)
      .gte("occurred_at", lastMonthStart.toISOString())
      .lt("occurred_at", monthStart.toISOString()),
    supabase.from("finance_budgets").select("category, monthly_limit").eq("user_id", user.id),
    supabase.from("finance_subscriptions").select("*").eq("user_id", user.id).eq("is_active", true),
    supabase.from("finance_loans").select("remaining_balance").eq("user_id", user.id),
    supabase.from("finance_assets").select("current_value").eq("user_id", user.id),
    supabase.from("finance_settings").select("currency").eq("user_id", user.id).maybeSingle(),
  ]);

  const err = txError ?? lastTxError ?? budgetError ?? subError ?? loanError ?? assetError;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const thisMonthRecords = (thisMonthTx ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    occurredAt: t.occurred_at,
  }));
  const lastMonthRecords = (lastMonthTx ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    occurredAt: t.occurred_at,
  }));

  const spendingByCategoryThisMonth = computeSpendingByCategory(thisMonthRecords);
  const spendingByCategoryLastMonth = computeSpendingByCategory(lastMonthRecords);
  const cashFlow = computeCashFlow(thisMonthRecords);
  const budgetUsage = computeBudgetUsage(
    (budgets ?? []).map((b) => ({ category: b.category, monthlyLimit: b.monthly_limit })),
    spendingByCategoryThisMonth,
  );

  const today = new Date();
  const overdueSubscriptions = (subscriptions ?? [])
    .filter((s) => s.next_billing_date && new Date(s.next_billing_date) < today)
    .map((s) => ({
      name: s.name,
      amount: s.amount,
      daysOverdue: Math.floor(
        (today.getTime() - new Date(s.next_billing_date!).getTime()) / (24 * 60 * 60 * 1000),
      ),
    }));

  const signals: FinanceInsightSignals = {
    currency: settings?.currency ?? "EUR",
    cashFlow,
    spendingByCategoryThisMonth,
    spendingByCategoryLastMonth,
    budgetUsage,
    projectedMonthEndSpend: projectMonthEndSpend(cashFlow.expenses, dayOfMonth, daysInMonth),
    monthlySubscriptionCost: computeMonthlySubscriptionCost(
      (subscriptions ?? []).map((s) => ({ amount: s.amount, billingCycle: s.billing_cycle })),
    ).monthlyEquivalent,
    overdueSubscriptions,
    netWorth: computeNetWorth({
      assetValues: (assets ?? []).map((a) => a.current_value),
      loanBalances: (loans ?? []).map((l) => l.remaining_balance),
    }),
  };

  try {
    const locale = await getLocale();
    const result = await generateFinanceInsights(signals, locale);

    await supabase.from("finance_insights").insert({
      user_id: user.id,
      headline: result.headline,
      insights: result.insights,
      signals: signals as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Finance insights failed" },
      { status: 502 },
    );
  }
}
