"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayersIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { reviewFlashcard } from "@/app/(app)/learn/actions";
import { useTranslations } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/messages/en";
import type { Tables } from "@/types/database";

function qualityOptions(learn: Messages["learn"]): { quality: number; label: string; className: string }[] {
  return [
    { quality: 1, label: learn.qualityForgot, className: "border-destructive/40 text-destructive hover:bg-destructive/10" },
    { quality: 3, label: learn.qualityHard, className: "border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400" },
    { quality: 4, label: learn.qualityGood, className: "border-primary/40 text-primary hover:bg-primary/10" },
    { quality: 5, label: learn.qualityEasy, className: "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" },
  ];
}

export function FlashcardReview({ courseId, dueCards }: { courseId: string; dueCards: Tables<"flashcards">[] }) {
  const router = useRouter();
  const { messages } = useTranslations();
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
        toast.error(messages.learn.reviewSaveError, { description: result.error });
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
        <p className="text-sm text-muted-foreground">{messages.learn.noFlashcardsDue}</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border py-8 text-center">
        <p className="text-sm font-medium">{messages.learn.reviewComplete}</p>
        <p className="text-xs text-muted-foreground">
          {messages.learn.reviewedCount.replace("{count}", String(reviewedCount))}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{messages.learn.cardsDue.replace("{count}", String(queue.length))}</p>
      <button
        type="button"
        onClick={() => setIsFlipped((f) => !f)}
        className={cn(
          "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border p-6 text-center transition-colors hover:border-primary/40",
        )}
      >
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {isFlipped ? messages.learn.answer : messages.learn.question}
        </span>
        <span className="text-base font-medium whitespace-pre-wrap">{isFlipped ? current.back : current.front}</span>
        {!isFlipped && <span className="text-xs text-muted-foreground">{messages.learn.tapToReveal}</span>}
      </button>

      {isFlipped && (
        <div className="grid grid-cols-4 gap-2">
          {qualityOptions(messages.learn).map((option) => (
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
