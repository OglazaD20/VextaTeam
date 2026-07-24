"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MonthlyTrendPoint } from "@/app/(app)/finance/actions";

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(year, month - 1, 1));
}

export function FinanceTrendChart({ points, currency }: { points: MonthlyTrendPoint[]; currency: string }) {
  const hasData = points.some((p) => p.income > 0 || p.expenses > 0);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground">Log a transaction to see your trend here.</p>;
  }

  const data = points.map((p) => ({ label: formatMonthLabel(p.monthKey), Income: p.income, Expenses: p.expenses }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => [`${value} ${currency}`, ""]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
