import type { Metadata } from "next";

import { getAutomationsOverview } from "./actions";
import { AutomationsClient } from "@/components/automations/automations-client";

export const metadata: Metadata = { title: "Automations — LifeFlow" };

export default async function AutomationsPage() {
  const result = await getAutomationsOverview();

  if (result.error || !result.data) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-6">
        <p className="text-sm text-destructive">{result.error ?? "Couldn't load automations"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <AutomationsClient initialOverview={result.data} />
    </div>
  );
}
