"use client";

import * as React from "react";
import { LayersIcon } from "lucide-react";

import { FlashcardReview } from "@/components/learn/flashcard-review";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function FlashcardSection({ courseId, flashcards }: { courseId: string; flashcards: Tables<"flashcards">[] }) {
  const [isReviewing, setIsReviewing] = React.useState(false);
  const now = new Date().getTime();
  const dueCards = flashcards.filter((c) => new Date(c.due_at).getTime() <= now);

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
        <LayersIcon className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No flashcards yet — ask the AI Tutor to make some for this course.
        </p>
      </div>
    );
  }

  if (isReviewing) {
    return <FlashcardReview courseId={courseId} dueCards={dueCards} />;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div>
        <p className="text-sm font-medium">{flashcards.length} flashcard{flashcards.length === 1 ? "" : "s"}</p>
        <p className="text-xs text-muted-foreground">
          {dueCards.length > 0 ? `${dueCards.length} due for review` : "All caught up"}
        </p>
      </div>
      <Button size="sm" disabled={dueCards.length === 0} onClick={() => setIsReviewing(true)}>
        Start review
      </Button>
    </div>
  );
}
