"use client";

import * as React from "react";
import { HelpCircleIcon } from "lucide-react";

import { QuizTaker } from "@/components/learn/quiz-taker";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function QuizList({ courseId, quizzes }: { courseId: string; quizzes: Tables<"quizzes">[] }) {
  const [activeQuizId, setActiveQuizId] = React.useState<string | null>(null);

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
        <HelpCircleIcon className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No quizzes yet — ask the AI Tutor to quiz you on this course.
        </p>
      </div>
    );
  }

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId);
  if (activeQuiz) {
    return <QuizTaker courseId={courseId} quiz={activeQuiz} onDone={() => setActiveQuizId(null)} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {quizzes.map((quiz) => (
        <div key={quiz.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">{quiz.title}</p>
            <p className="text-xs text-muted-foreground">{quiz.questions.length} questions</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveQuizId(quiz.id)}>
            Take quiz
          </Button>
        </div>
      ))}
    </div>
  );
}
