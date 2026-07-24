"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CoachInsight {
  title: string;
  detail: string;
}

interface CoachData {
  headline: string;
  insights: CoachInsight[];
}

/** The evening dashboard's "AI reflection" is the existing daily coach insight, re-shown in a reflective framing — same real, deterministically-computed signals, no separate AI pipeline needed. */
export function EveningReflection() {
  const [data, setData] = React.useState<CoachData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/coach?period=daily")
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setData(json.data ?? null);
      })
      .catch(() => {
        // Best-effort — "Generate" still works if this fails.
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
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "daily" }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error("Couldn't generate a reflection", { description: json.error });
        return;
      }
      setData(json.data);
    } catch {
      toast.error("Couldn't reach the AI coach");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Not enough logged today for a reflection yet — hit generate for a look at your day.
        </p>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isGenerating} className="self-start">
          {isGenerating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Generate
        </Button>
      </div>
    );
  }

  return (
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
      <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={isGenerating} className="self-start">
        {isGenerating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
        Refresh
      </Button>
    </div>
  );
}
