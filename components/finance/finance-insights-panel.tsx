"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinanceInsight {
  title: string;
  detail: string;
}

interface FinanceInsightsData {
  headline: string;
  insights: FinanceInsight[];
}

export function FinanceInsightsPanel() {
  const [data, setData] = React.useState<FinanceInsightsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must show loading immediately on mount, before the fetch resolves
    setIsLoading(true);
    fetch("/api/ai/finance-insights")
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setData(json.data ?? null);
      })
      .catch(() => {
        // Silent — best-effort cached fetch, "Refresh" still works.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/finance-insights", { method: "POST" });
      const json = await response.json();
      if (!response.ok) {
        toast.error("Couldn't generate insights", { description: json.error });
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Couldn't reach the finance assistant");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI insights</CardTitle>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : data ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{data.headline}</p>
            {data.insights.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {data.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{insight.title}</span> {insight.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Log a few transactions, then hit refresh for personalized insights.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
