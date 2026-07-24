import type { Metadata } from "next";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClockIcon, FlameIcon, GraduationCapIcon } from "lucide-react";

import { CreateCourseDialog } from "@/components/learn/create-course-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { computeStreak } from "@/lib/habits/streak";
import { getDictionary } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Learn — LifeFlow" };

export default async function LearnPage() {
  const { t } = await getDictionary();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const timeZone = profile?.timezone ?? "UTC";

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [{ data: courses }, { data: studySessions }, { data: dueFlashcards }] = await Promise.all([
    supabase.from("courses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("study_sessions")
      .select("logged_for_date")
      .eq("user_id", user.id)
      .gte("logged_for_date", sixtyDaysAgo.toISOString().slice(0, 10)),
    supabase
      .from("flashcards")
      .select("id, course_id")
      .lte("due_at", new Date().toISOString()),
  ]);

  const streak = computeStreak(new Set((studySessions ?? []).map((s) => s.logged_for_date)), timeZone);

  const dueCountByCourse = new Map<string, number>();
  for (const card of dueFlashcards ?? []) {
    dueCountByCourse.set(card.course_id, (dueCountByCourse.get(card.course_id) ?? 0) + 1);
  }

  const activeCourses = (courses ?? []).filter((c) => c.status === "active");
  const otherCourses = (courses ?? []).filter((c) => c.status !== "active");

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.learn.title}</h1>
          <p className="text-sm text-muted-foreground">{t.learn.subtitle}</p>
        </div>
        <CreateCourseDialog />
      </div>

      {streak > 0 && (
        <div className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm">
          <FlameIcon className="size-4 text-orange-500" />
          <span className="font-medium">{t.learn.studyStreak.replace("{days}", String(streak))}</span>
        </div>
      )}

      {activeCourses.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeCourses.map((course) => {
            const examDays = course.exam_date
              ? differenceInCalendarDays(new Date(`${course.exam_date}T00:00:00`), new Date())
              : null;
            const dueCount = dueCountByCourse.get(course.id) ?? 0;
            return (
              <Link key={course.id} href={`/learn/${course.id}`}>
                <Card className="glass-surface h-full transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <div className="flex items-center gap-2">
                      <GraduationCapIcon className="size-4 text-primary" />
                      <p className="font-medium">{course.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{course.subject}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {examDays !== null && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CalendarClockIcon className="size-3" />
                          {examDays >= 0
                            ? t.learn.examInDays.replace("{days}", String(examDays))
                            : t.learn.examPassed}
                        </Badge>
                      )}
                      {dueCount > 0 && (
                        <Badge variant="secondary">{t.learn.dueCount.replace("{count}", String(dueCount))}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <GraduationCapIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">{t.learn.noCoursesTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t.learn.noCoursesBody}</p>
          </div>
        </div>
      )}

      {otherCourses.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t.learn.completedArchived}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherCourses.map((course) => (
              <Link key={course.id} href={`/learn/${course.id}`}>
                <Card className="glass-surface h-full opacity-70 transition-colors hover:border-primary/40 hover:opacity-100">
                  <CardContent className="flex items-center gap-2 pt-6">
                    <GraduationCapIcon className="size-4 text-muted-foreground" />
                    <p className="font-medium">{course.title}</p>
                    <Badge variant="outline" className="ml-auto capitalize">{course.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
