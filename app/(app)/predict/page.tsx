import type { Metadata } from "next";

import { PredictPanel } from "@/components/predict/predict-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Predict — LifeFlow" };

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: predictions } = await supabase
    .from("ai_predictions")
    .select("*")
    .eq("user_id", user.id)
    .order("confidence_pct", { ascending: false });

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI Predict</h1>
        <p className="text-sm text-muted-foreground">Where you&apos;re headed, based on your own data.</p>
      </div>

      <PredictPanel initialPredictions={predictions ?? []} />
    </div>
  );
}
