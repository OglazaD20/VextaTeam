import type { ChatCompletionTool } from "openai/resources/chat/completions";

import type { ToolContext } from "@/lib/ai/chat-tools";

export const TUTOR_CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_lesson_content",
      description: "Fetch a lesson's saved notes/content, to explain, summarize, or quiz on it accurately.",
      parameters: {
        type: "object",
        properties: { lessonId: { type: "string" } },
        required: ["lessonId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_flashcards",
      description:
        "Create and save a set of flashcards for a course (optionally tied to one lesson). Write the actual " +
        "front/back content yourself — front is a short question or term, back is the concise answer. Use " +
        "when the user asks for flashcards on a topic, or to help them study a lesson.",
      parameters: {
        type: "object",
        properties: {
          courseId: { type: "string" },
          lessonId: { type: ["string", "null"] },
          cards: {
            type: "array",
            minItems: 3,
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
              additionalProperties: false,
            },
          },
        },
        required: ["courseId", "lessonId", "cards"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_quiz",
      description:
        "Create and save a multiple-choice quiz for a course (optionally tied to one lesson). Write the " +
        "actual questions yourself, each with 4 options, the correct option's index, and a one-sentence " +
        "explanation. Use when the user asks to be quizzed or tested on a topic.",
      parameters: {
        type: "object",
        properties: {
          courseId: { type: "string" },
          lessonId: { type: ["string", "null"] },
          title: { type: "string" },
          questions: {
            type: "array",
            minItems: 3,
            maxItems: 15,
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
                correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                explanation: { type: "string" },
              },
              required: ["question", "options", "correctIndex", "explanation"],
              additionalProperties: false,
            },
          },
        },
        required: ["courseId", "lessonId", "title", "questions"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_study_plan",
      description:
        "Schedule daily study blocks for a course directly on the user's real calendar. Use when the user " +
        "asks for a study plan or schedule to prepare for an exam or work through a course.",
      parameters: {
        type: "object",
        properties: {
          courseId: { type: "string" },
          minutesPerDay: { type: "integer", minimum: 10, maximum: 240 },
          days: { type: "integer", minimum: 1, maximum: 60, description: "How many days ahead to schedule, starting tomorrow." },
        },
        required: ["courseId", "minutesPerDay", "days"],
        additionalProperties: false,
      },
    },
  },
];

interface FlashcardDraft {
  front: string;
  back: string;
}

interface QuizQuestionDraft {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

async function getLessonContent(ctx: ToolContext, args: { lessonId: string }) {
  const { data: lesson } = await ctx.supabase
    .from("lessons")
    .select("title, content, course_id")
    .eq("id", args.lessonId)
    .single();

  if (!lesson) return { error: "Lesson not found" };
  return { title: lesson.title, content: lesson.content ?? "" };
}

async function generateFlashcards(
  ctx: ToolContext,
  args: { courseId: string; lessonId: string | null; cards: FlashcardDraft[] },
) {
  const { data, error } = await ctx.supabase
    .from("flashcards")
    .insert(
      args.cards.map((c) => ({
        course_id: args.courseId,
        lesson_id: args.lessonId,
        front: c.front,
        back: c.back,
      })),
    )
    .select("id, front, back");

  if (error) return { error: error.message };
  return { created: data?.length ?? 0 };
}

async function generateQuiz(
  ctx: ToolContext,
  args: { courseId: string; lessonId: string | null; title: string; questions: QuizQuestionDraft[] },
) {
  const { data, error } = await ctx.supabase
    .from("quizzes")
    .insert({ course_id: args.courseId, lesson_id: args.lessonId, title: args.title, questions: args.questions })
    .select("id, title")
    .single();

  if (error) return { error: error.message };
  return { quizId: data?.id, title: data?.title, questionCount: args.questions.length };
}

async function createStudyPlan(
  ctx: ToolContext,
  args: { courseId: string; minutesPerDay: number; days: number },
) {
  const { data: course } = await ctx.supabase
    .from("courses")
    .select("title")
    .eq("id", args.courseId)
    .single();

  if (!course) return { error: "Course not found" };

  const rows = [];
  for (let i = 1; i <= args.days; i++) {
    const start = new Date();
    start.setDate(start.getDate() + i);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + args.minutesPerDay * 60_000);
    rows.push({
      user_id: ctx.userId,
      type: "task" as const,
      title: `Study: ${course.title}`,
      estimated_duration_minutes: args.minutesPerDay,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      is_fixed: false,
      source: "ai_suggested" as const,
    });
  }

  const { error } = await ctx.supabase.from("schedule_items").insert(rows);
  if (error) return { error: error.message };

  return { scheduled: rows.length, courseTitle: course.title };
}

export async function executeTutorTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_lesson_content":
      return getLessonContent(ctx, args as { lessonId: string });
    case "generate_flashcards":
      return generateFlashcards(
        ctx,
        args as { courseId: string; lessonId: string | null; cards: FlashcardDraft[] },
      );
    case "generate_quiz":
      return generateQuiz(
        ctx,
        args as { courseId: string; lessonId: string | null; title: string; questions: QuizQuestionDraft[] },
      );
    case "create_study_plan":
      return createStudyPlan(ctx, args as { courseId: string; minutesPerDay: number; days: number });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
