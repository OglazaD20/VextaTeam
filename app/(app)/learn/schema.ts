import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(60).default("general"),
  description: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
  color: z.string().trim().max(20).optional(),
  examDate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  dailyStudyGoalMinutes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().max(600).optional(),
  ),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const createLessonSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(150),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonContentSchema = z.object({
  lessonId: z.string().uuid(),
  content: z.string().trim().max(20000),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: z.string().uuid(),
  quality: z.coerce.number().int().min(0).max(5),
});

export const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.number().int().min(0).max(3)),
});

export const logStudySessionSchema = z.object({
  courseId: z.string().uuid().optional(),
  durationMinutes: z.coerce.number().int().positive().max(600),
});
