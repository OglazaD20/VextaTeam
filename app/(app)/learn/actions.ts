"use server";

import { revalidatePath } from "next/cache";

import { computeNextReview } from "@/lib/learning/spaced-repetition";
import { awardXpAndCheckAchievements } from "@/lib/gamification/engine";
import { getTodayKey } from "@/lib/habits/today-key";
import { createClient } from "@/lib/supabase/server";
import {
  createCourseSchema,
  createLessonSchema,
  logStudySessionSchema,
  reviewFlashcardSchema,
  submitQuizAttemptSchema,
  updateLessonContentSchema,
  type CreateCourseInput,
  type CreateLessonInput,
} from "./schema";

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  return { supabase, user, timeZone: profile?.timezone ?? "UTC" };
}

function revalidateLearn(courseId?: string) {
  revalidatePath("/learn");
  if (courseId) revalidatePath(`/learn/${courseId}`);
}

export async function createCourse(input: CreateCourseInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      title: data.title,
      subject: data.subject,
      description: data.description ?? null,
      color: data.color ?? null,
      exam_date: data.examDate ?? null,
      daily_study_goal_minutes: data.dailyStudyGoalMinutes ?? null,
    })
    .select("id")
    .single();

  if (error || !course) {
    return { error: error?.message ?? "Couldn't create that course" };
  }

  revalidateLearn();
  return { data: { id: course.id } };
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("courses").delete().eq("id", courseId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidateLearn();
  return {};
}

export async function archiveCourse(courseId: string, status: "active" | "completed" | "archived"): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("courses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidateLearn(courseId);
  return {};
}

export async function createLesson(input: CreateLessonInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createLessonSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const data = parsed.data;

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", data.courseId);

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({ course_id: data.courseId, title: data.title, sort_order: count ?? 0 })
    .select("id")
    .single();

  if (error || !lesson) {
    return { error: error?.message ?? "Couldn't create that lesson" };
  }

  revalidateLearn(data.courseId);
  return { data: { id: lesson.id } };
}

export async function deleteLesson(lessonId: string, courseId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { error: error.message };

  revalidateLearn(courseId);
  return {};
}

export async function updateLessonContent(input: { lessonId: string; content: string; courseId: string }): Promise<ActionResult> {
  const parsed = updateLessonContentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("lessons")
    .update({ content: parsed.data.content })
    .eq("id", parsed.data.lessonId);
  if (error) return { error: error.message };

  revalidateLearn(input.courseId);
  return {};
}

export async function toggleLessonBookmark(lessonId: string, courseId: string, isBookmarked: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("lessons").update({ is_bookmarked: isBookmarked }).eq("id", lessonId);
  if (error) return { error: error.message };

  revalidateLearn(courseId);
  return {};
}

export async function toggleLessonCompleted(lessonId: string, courseId: string, isCompleted: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("lessons").update({ is_completed: isCompleted }).eq("id", lessonId);
  if (error) return { error: error.message };

  revalidateLearn(courseId);
  return {};
}

/** Scores a flashcard review with SM-2 and persists the new spaced-repetition state. */
export async function reviewFlashcard(
  input: { flashcardId: string; quality: number },
  courseId: string,
): Promise<ActionResult<{ intervalDays: number }>> {
  const parsed = reviewFlashcardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user, timeZone } = await requireUser();
  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .select("ease_factor, interval_days, repetitions")
    .eq("id", parsed.data.flashcardId)
    .single();

  if (cardError || !card) {
    return { error: cardError?.message ?? "Flashcard not found" };
  }

  const result = computeNextReview(
    { easeFactor: card.ease_factor, intervalDays: card.interval_days, repetitions: card.repetitions },
    parsed.data.quality,
  );

  const { error } = await supabase
    .from("flashcards")
    .update({
      ease_factor: result.easeFactor,
      interval_days: result.intervalDays,
      repetitions: result.repetitions,
      due_at: result.dueAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.flashcardId);

  if (error) return { error: error.message };

  await awardXpAndCheckAchievements(supabase, user.id, timeZone, "flashcard_reviewed", parsed.data.flashcardId, 1);

  revalidateLearn(courseId);
  return { data: { intervalDays: result.intervalDays } };
}

/** Scores a quiz attempt against the quiz's stored answer key and persists the result. */
export async function submitQuizAttempt(
  input: { quizId: string; answers: number[] },
  courseId: string,
): Promise<ActionResult<{ scorePct: number }>> {
  const parsed = submitQuizAttemptSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user, timeZone } = await requireUser();
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("id", parsed.data.quizId)
    .single();

  if (quizError || !quiz) {
    return { error: quizError?.message ?? "Quiz not found" };
  }

  const questions = quiz.questions;
  const correctCount = questions.reduce(
    (sum, q, i) => sum + (parsed.data.answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: parsed.data.quizId,
    user_id: user.id,
    score_pct: scorePct,
    answers: parsed.data.answers,
  });
  if (error) return { error: error.message };

  await awardXpAndCheckAchievements(supabase, user.id, timeZone, "quiz_completed", parsed.data.quizId, 5);

  revalidateLearn(courseId);
  return { data: { scorePct } };
}

/** Logs a study session, using the caller's local "today" so the streak lines up with their calendar day. */
export async function logStudySession(input: { courseId?: string; durationMinutes: number }): Promise<ActionResult> {
  const parsed = logStudySessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user, timeZone } = await requireUser();
  const loggedForDate = getTodayKey(timeZone);

  const { data: session, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      course_id: parsed.data.courseId ?? null,
      duration_minutes: parsed.data.durationMinutes,
      logged_for_date: loggedForDate,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (session) {
    await awardXpAndCheckAchievements(supabase, user.id, timeZone, "study_session_logged", session.id, 10);
  }

  revalidateLearn(parsed.data.courseId);
  return {};
}
