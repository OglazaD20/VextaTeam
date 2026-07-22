"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LifeScoreTrendPoint } from "@/app/(app)/analytics/actions";

export function LifeScoreTrendChart({ points }: { points: LifeScoreTrendPoint[] }) {
  const hasData = points.some((p) => p.score !== null);
  if (!hasData) {
    return <p className="text-sm text-muted-foreground">Keep using LifeFlow and your weekly trend will show up here.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={28}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="score" name="Life Score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
