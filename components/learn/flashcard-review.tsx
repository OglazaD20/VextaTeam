"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayersIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { reviewFlashcard } from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const QUALITY_OPTIONS: { quality: number; label: string; className: string }[] = [
  { quality: 1, label: "Forgot", className: "border-destructive/40 text-destructive hover:bg-destructive/10" },
  { quality: 3, label: "Hard", className: "border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400" },
  { quality: 4, label: "Good", className: "border-primary/40 text-primary hover:bg-primary/10" },
  { quality: 5, label: "Easy", className: "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" },
];

export function FlashcardReview({ courseId, dueCards }: { courseId: string; dueCards: Tables<"flashcards">[] }) {
  const router = useRouter();
  const [queue, setQueue] = React.useState(dueCards);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [reviewedCount, setReviewedCount] = React.useState(0);

  const current = queue[0];

  function handleRate(quality: number) {
    if (!current) return;
    startTransition(async () => {
      const result = await reviewFlashcard({ flashcardId: current.id, quality }, courseId);
      if (result.error) {
        toast.error("Couldn't save that review", { description: result.error });
        return;
      }
      setQueue((prev) => prev.slice(1));
      setReviewedCount((c) => c + 1);
      setIsFlipped(false);
      router.refresh();
    });
  }

  if (dueCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
        <LayersIcon className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No flashcards due right now.</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-8 text-center">
        <p className="text-sm font-medium">Review complete</p>
        <p className="text-xs text-muted-foreground">You reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{queue.length} card{queue.length === 1 ? "" : "s"} due</p>
      <button
        type="button"
        onClick={() => setIsFlipped((f) => !f)}
        className={cn(
          "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border p-6 text-center transition-colors hover:border-primary/40",
        )}
      >
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {isFlipped ? "Answer" : "Question"}
        </span>
        <span className="text-base font-medium whitespace-pre-wrap">{isFlipped ? current.back : current.front}</span>
        {!isFlipped && <span className="text-xs text-muted-foreground">Tap to reveal answer</span>}
      </button>

      {isFlipped && (
        <div className="grid grid-cols-4 gap-2">
          {QUALITY_OPTIONS.map((option) => (
            <Button
              key={option.quality}
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleRate(option.quality)}
              className={option.className}
            >
              {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
