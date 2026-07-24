"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { CoachInsightCard, type CoachInsight } from "@/components/coach/coach-insight-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "daily" | "weekly" | "monthly";

interface CoachData {
  headline: string;
  insights: CoachInsight[];
}

export function CoachPanel() {
  const [period, setPeriod] = React.useState<Period>("daily");
  const [data, setData] = React.useState<CoachData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must show loading immediately when `period` changes, before the fetch resolves
    setIsLoading(true);
    fetch(`/api/ai/coach?period=${period}`)
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setData(json.data ?? null);
      })
      .catch(() => {
        // Silent — this is a best-effort cached fetch, "Refresh" still works.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error("Couldn't generate coaching", { description: json.error });
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Couldn't reach the AI coach");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      ) : data ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{data.headline}</p>
          {data.insights.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {data.insights.map((insight, index) => (
                <CoachInsightCard key={index} insight={insight} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not enough data yet — log a few tasks, habits, or health metrics, then hit refresh.
        </p>
      )}
    </div>
  );
}
