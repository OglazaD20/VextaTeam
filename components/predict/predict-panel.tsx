"use client";

import * as React from "react";
import { Loader2Icon, SparklesIcon, TrendingUpIcon } from "lucide-react";
import { toast } from "sonner";

import { PredictionCard } from "@/components/predict/prediction-card";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function PredictPanel({ initialPredictions }: { initialPredictions: Tables<"ai_predictions">[] }) {
  const [predictions, setPredictions] = React.useState(initialPredictions);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasGenerated, setHasGenerated] = React.useState(initialPredictions.length > 0);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/predict", { method: "POST" });
      const json = await response.json();
      if (!response.ok) {
        toast.error("Couldn't generate predictions", { description: json.error });
        return;
      }
      setPredictions(json.data ?? []);
      setHasGenerated(true);
      if ((json.data ?? []).length === 0) {
        toast.info("Not enough data yet", {
          description: "Log a few more days of tasks, habits, or health data, then try again.",
        });
      }
    } catch {
      toast.error("Couldn't reach AI Predict");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Predictions are generated from your own logged data — never invented. Confidence reflects how much
          signal there actually is.
        </p>
        <Button size="sm" onClick={handleGenerate} disabled={isGenerating} className="shrink-0">
          {isGenerating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {hasGenerated ? "Refresh" : "Generate predictions"}
        </Button>
      </div>

      {predictions.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <TrendingUpIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {hasGenerated ? "No strong predictions yet" : "See where you're headed"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {hasGenerated
                ? "Keep logging tasks, habits, and health data — predictions get more useful with more history."
                : "AI Predict looks at your goals, habits, health, and finances to forecast what's likely to happen next."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
