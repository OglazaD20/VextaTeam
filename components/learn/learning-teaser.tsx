import { differenceInCalendarDays } from "date-fns";
import { CalendarClockIcon, LayersIcon } from "lucide-react";

interface NearestExam {
  title: string;
  examDate: string;
}

export function LearningTeaser({
  dueFlashcardCount,
  nearestExam,
}: {
  dueFlashcardCount: number;
  nearestExam: NearestExam | null;
}) {
  if (dueFlashcardCount === 0 && !nearestExam) {
    return (
      <p className="text-sm text-muted-foreground">
        Start a course and let your AI Tutor build flashcards, quizzes, and a study plan.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {dueFlashcardCount > 0 && (
        <div className="flex items-start gap-2">
          <LayersIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-sm">
            {dueFlashcardCount} flashcard{dueFlashcardCount === 1 ? "" : "s"} due for review
          </p>
        </div>
      )}
      {nearestExam && (
        <div className="flex items-start gap-2">
          <CalendarClockIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-sm">
            {nearestExam.title}: exam in{" "}
            {Math.max(0, differenceInCalendarDays(new Date(`${nearestExam.examDate}T00:00:00`), new Date()))} days
          </p>
        </div>
      )}
    </div>
  );
}
