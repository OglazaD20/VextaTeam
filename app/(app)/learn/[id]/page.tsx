import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClockIcon, LayersIcon, HelpCircleIcon, NotebookTextIcon } from "lucide-react";

import { DeleteCourseButton } from "@/components/learn/delete-course-button";
import { FlashcardSection } from "@/components/learn/flashcard-section";
import { LessonList } from "@/components/learn/lesson-list";
import { LogStudySessionButton } from "@/components/learn/log-study-session-button";
import { QuizList } from "@/components/learn/quiz-list";
import { TutorChatPanel } from "@/components/learn/tutor-chat-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course — LifeFlow" };

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: course } = await supabase.from("courses").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!course) notFound();

  const [{ data: lessons }, { data: flashcards }, { data: quizzes }] = await Promise.all([
    supabase.from("lessons").select("*").eq("course_id", id).order("sort_order", { ascending: true }),
    supabase.from("flashcards").select("*").eq("course_id", id).order("due_at", { ascending: true }),
    supabase.from("quizzes").select("*").eq("course_id", id).order("created_at", { ascending: false }),
  ]);

  const examDays = course.exam_date
    ? differenceInCalendarDays(new Date(`${course.exam_date}T00:00:00`), new Date())
    : null;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground capitalize">{course.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <LogStudySessionButton courseId={course.id} />
          <DeleteCourseButton courseId={course.id} />
        </div>
      </div>

      {examDays !== null && (
        <div className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm">
          <CalendarClockIcon className="size-4 text-primary" />
          <span className="font-medium">{examDays >= 0 ? `Exam in ${examDays} day${examDays === 1 ? "" : "s"}` : "Exam date passed"}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookTextIcon className="size-4" /> Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LessonList courseId={course.id} lessons={lessons ?? []} />
            </CardContent>
          </Card>

          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayersIcon className="size-4" /> Flashcards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlashcardSection courseId={course.id} flashcards={flashcards ?? []} />
            </CardContent>
          </Card>

          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircleIcon className="size-4" /> Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuizList courseId={course.id} quizzes={quizzes ?? []} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <TutorChatPanel
            courseId={course.id}
            suggestions={[
              `Explain the basics of ${course.subject}`,
              `Make 10 flashcards for ${course.title}`,
              `Quiz me on ${course.title}`,
              `Build me a study plan for ${course.title}`,
            ]}
          />
        </div>
      </div>
    </div>
  );
}
