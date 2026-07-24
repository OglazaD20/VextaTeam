"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DailyMoodPoint } from "@/lib/mood/daily-average";

export function MoodChart({ points }: { points: DailyMoodPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Log a check-in to see your trend here.</p>;
  }

  const data = points.map((p) => ({
    label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
      new Date(`${p.dateKey}T12:00:00`),
    ),
    mood: p.avgMood,
    energy: p.avgEnergy,
    stress: p.avgStress,
  }));

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
          width={24}
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="mood" name="Mood" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="energy" name="Energy" stroke="var(--macro-carbs)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="stress" name="Stress" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
