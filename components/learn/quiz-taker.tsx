"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, CircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { submitQuizAttempt } from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function QuizTaker({ courseId, quiz, onDone }: { courseId: string; quiz: Tables<"quizzes">; onDone?: () => void }) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState<(number | null)[]>(quiz.questions.map(() => null));
  const [submitted, setSubmitted] = React.useState(false);
  const [scorePct, setScorePct] = React.useState<number | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const allAnswered = answers.every((a) => a !== null);

  function handleSelect(questionIndex: number, optionIndex: number) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === questionIndex ? optionIndex : a)));
  }

  function handleSubmit() {
    if (!allAnswered) return;
    startTransition(async () => {
      const result = await submitQuizAttempt({ quizId: quiz.id, answers: answers as number[] }, courseId);
      if (result.error || result.data === undefined) {
        toast.error("Couldn't submit that quiz", { description: result.error });
        return;
      }
      setScorePct(result.data.scorePct);
      setSubmitted(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {submitted && scorePct !== null && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
          <p className="text-lg font-semibold">{scorePct}%</p>
          <p className="text-xs text-muted-foreground">
            {answers.filter((a, i) => a === quiz.questions[i].correctIndex).length}/{quiz.questions.length} correct
          </p>
        </div>
      )}

      {quiz.questions.map((question, qi) => (
        <div key={qi} className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {qi + 1}. {question.question}
          </p>
          <div className="flex flex-col gap-1.5">
            {question.options.map((option, oi) => {
              const isSelected = answers[qi] === oi;
              const isCorrect = submitted && oi === question.correctIndex;
              const isWrongSelection = submitted && isSelected && oi !== question.correctIndex;
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => handleSelect(qi, oi)}
                  disabled={submitted}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors",
                    isSelected && !submitted && "border-primary bg-primary/5",
                    isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isWrongSelection && "border-destructive/50 bg-destructive/10",
                  )}
                >
                  {submitted ? (
                    isCorrect ? (
                      <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : isWrongSelection ? (
                      <XCircleIcon className="size-3.5 shrink-0 text-destructive" />
                    ) : (
                      <CircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    )
                  ) : (
                    <CircleIcon className={cn("size-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                  )}
                  {option}
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="text-xs text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      ))}

      {!submitted ? (
        <Button onClick={handleSubmit} disabled={!allAnswered || isPending}>
          {isPending && <Loader2Icon className="animate-spin" />}
          Submit quiz
        </Button>
      ) : (
        onDone && (
          <Button variant="secondary" onClick={onDone}>
            Close
          </Button>
        )
      )}
    </div>
  );
}
