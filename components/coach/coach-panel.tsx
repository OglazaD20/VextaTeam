"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "daily" | "weekly" | "monthly";

interface CoachInsight {
  title: string;
  detail: string;
}

interface CoachData {
  headline: string;
  insights: CoachInsight[];
}

export function CoachPanel() {
  const [period, setPeriod] = React.useState<Period>("daily");
  const [data, setData] = React.useState<CoachData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasFetchedInitial, setHasFetchedInitial] = React.useState<Period | null>(null);

  const loadCached = React.useCallback(async (p: Period) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/coach?period=${p}`);
      const json = await response.json();
      setData(json.data ?? null);
    } catch {
      // Silent — this is a best-effort cached fetch, "Refresh" still works.
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (hasFetchedInitial !== period) {
    setHasFetchedInitial(period);
    void loadCached(period);
  }

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
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{data.headline}</p>
          {data.insights.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {data.insights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{insight.title}</span>{" "}
                  {insight.detail}
                </li>
              ))}
            </ul>
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
