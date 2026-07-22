"use client";

import * as React from "react";

import { HealthTrendChart, type TrendPoint } from "@/components/health/health-trend-chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "7" | "30" | "90";

export function HealthTrendsSection({
  sleepTrend,
  stepsTrend,
  restingHrTrend,
}: {
  sleepTrend: TrendPoint[];
  stepsTrend: TrendPoint[];
  restingHrTrend: TrendPoint[];
}) {
  const [period, setPeriod] = React.useState<Period>("30");
  const days = Number(period);

  const slice = (points: TrendPoint[]) => points.slice(-days);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="7">7 days</TabsTrigger>
          <TabsTrigger value="30">30 days</TabsTrigger>
          <TabsTrigger value="90">90 days</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Sleep (hrs)</p>
        <HealthTrendChart data={slice(sleepTrend)} unit="hrs" emptyMessage="Log your sleep to see the trend here." />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Steps</p>
        <HealthTrendChart data={slice(stepsTrend)} unit="steps" emptyMessage="Log your steps to see the trend here." />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Resting heart rate</p>
        <HealthTrendChart
          data={slice(restingHrTrend)}
          unit="bpm"
          emptyMessage="Log your resting heart rate to see the trend here."
        />
      </div>
    </div>
  );
}
