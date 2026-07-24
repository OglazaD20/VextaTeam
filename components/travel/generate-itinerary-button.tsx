"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { generateItinerary } from "@/app/(app)/travel/actions";
import { Button } from "@/components/ui/button";

export function GenerateItineraryButton({ tripId, hasItinerary }: { tripId: string; hasItinerary: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateItinerary(tripId);
      if (result.error) {
        toast.error("Couldn't generate itinerary", { description: result.error });
        return;
      }
      toast.success("Itinerary ready");
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={handleGenerate} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
      {hasItinerary ? "Regenerate itinerary" : "Generate itinerary"}
    </Button>
  );
}
