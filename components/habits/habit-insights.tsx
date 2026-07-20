"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface Recommendation {
  habitId: string;
  message: string;
}

export function HabitInsights() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState<Recommendation[] | null>(null);

  async function handleClick() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/habit-insights", { method: "POST" });
      const json = await response.json();
      if (!response.ok) {
        toast.error("Couldn't get insights", { description: json.error });
        return;
      }
      setRecommendations(json.data.recommendations);
      if (json.data.recommendations.length === 0) {
        toast.success("You're on track — nothing to flag right now.");
      }
    } catch {
      toast.error("Couldn't reach the AI insights service");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isLoading}>
        {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
        AI insights
      </Button>

      {recommendations && recommendations.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <SparklesIcon className="size-4 text-primary" /> Habit insights
            </p>
            <button
              type="button"
              onClick={() => setRecommendations(null)}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {recommendations.map((rec) => (
              <li key={rec.habitId} className="text-sm text-muted-foreground">
                {rec.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
