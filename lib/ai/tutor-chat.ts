import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { AI_MODEL_CHAT, getOpenAIClient } from "@/lib/ai/client";
import type { ToolContext } from "@/lib/ai/chat-tools";
import { executeTutorTool, TUTOR_CHAT_TOOLS } from "@/lib/ai/tutor-tools";
import { languageInstruction } from "@/lib/ai/language";
import type { Locale } from "@/lib/i18n/locales";

const MAX_TOOL_ITERATIONS = 5;

export interface TutorCourseContext {
  id: string;
  title: string;
  subject: string;
  lessons: { id: string; title: string }[];
}

function systemPrompt(locale: Locale, course: TutorCourseContext | null): string {
  const parts = [
    "You are the AI Tutor inside LifeFlow's Learning Hub. You help the user learn: explain difficult concepts",
    "clearly and simply (with a concrete example when it helps), answer questions about their courses, and",
    "when asked, generate flashcards or a quiz (write real, accurate, well-written content yourself — these",
    "are genuine study material, not placeholders), summarize a lesson's notes (call get_lesson_content first",
    "if you don't already have the lesson's content in this conversation), or build a study plan that schedules",
    "real blocks on the user's calendar. Explanations should be pitched at a learner encountering the topic for",
    "the first time unless the user signals more expertise. Keep replies focused — a clear explanation over a",
    "long lecture. When you generate flashcards, a quiz, or a study plan, your reply should briefly confirm",
    "what you made (e.g. \"Added 8 flashcards on cell respiration\") — the app shows the actual content in a",
    "card below your message, so don't repeat every flashcard/question in the text reply.",
  ];

  if (course) {
    parts.push(
      `The user is currently viewing the course "${course.title}" (subject: ${course.subject}, courseId: ${course.id}).`,
      "When calling generate_flashcards, generate_quiz, or create_study_plan, use this courseId unless the user",
      "clearly means a different course.",
    );
    if (course.lessons.length > 0) {
      const lessonList = course.lessons.map((l) => `${l.title} (lessonId: ${l.id})`).join("; ");
      parts.push(`This course's lessons: ${lessonList}.`);
    }
  }

  parts.push(languageInstruction(locale));
  return parts.join(" ");
}

export async function runTutorChatTurn(
  ctx: ToolContext,
  history: ChatCompletionMessageParam[],
  course: TutorCourseContext | null = null,
): Promise<string> {
  const openai = getOpenAIClient();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(ctx.locale, course) },
    ...history,
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: AI_MODEL_CHAT,
      messages,
      tools: TUTOR_CHAT_TOOLS,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("The AI Tutor returned no response");
    }
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "";
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // Leave args empty; the tool will just see defaults.
      }

      const result = await executeTutorTool(ctx, toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("The AI Tutor took too many steps — try rephrasing.");
}
