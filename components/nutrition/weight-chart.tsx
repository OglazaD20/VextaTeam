"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface WeightPoint {
  label: string;
  weightKg: number | null;
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  const hasAnyData = data.some((d) => d.weightKg !== null);

  if (!hasAnyData) {
    return (
      <p className="text-sm text-muted-foreground">
        Log your weight to see the trend here.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
          domain={["dataMin - 2", "dataMax + 2"]}
        />
        <Tooltip
          formatter={(value) => [`${value} kg`, "Weight"]}
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
