"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ProductivityPoint {
  key: string;
  label: string;
  productiveMinutes: number;
}

export function ProductivityChart({ data }: { data: ProductivityPoint[] }) {
  const hasAnyData = data.some((d) => d.productiveMinutes > 0);

  if (!hasAnyData) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete a focus session to see productive time here.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          formatter={(value) => [`${value} min`, "Productive time"]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="productiveMinutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
