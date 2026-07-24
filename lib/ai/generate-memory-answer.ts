import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "./client";
import { languageInstruction } from "./language";
import type { Locale } from "@/lib/i18n/locales";

const answerSchema = z.object({
  answer: z.string().max(500),
  citedMemoryIds: z.array(z.string()).max(10),
});

export type MemoryAnswer = z.infer<typeof answerSchema>;

export interface RetrievedMemory {
  id: string;
  title: string;
  content: string;
  category: string | null;
  occurredAt: string;
  similarity: number;
}

/**
 * Answers a natural-language question about the user's own history using
 * only the memories retrieved by vector search (lib/memory — the AI never
 * sees anything it wasn't handed, and is told explicitly not to invent a
 * memory that isn't in the retrieved list — classic retrieval-augmented
 * generation, same "never invent" principle as every other AI feature here.
 */
export async function generateMemoryAnswer(
  question: string,
  memories: RetrievedMemory[],
  locale: Locale,
): Promise<MemoryAnswer> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content:
          "Answer the user's question about their own history using ONLY the memories provided " +
          "below — never invent a memory, date, or detail that isn't in the list. If none of the " +
          "memories actually answer the question, say so plainly rather than guessing. Reference " +
          "specific memories by name/date in your answer, in the style of: \"You saved Sushi Palace " +
          "on March 3rd.\" Return the ids of the memories you actually used in citedMemoryIds. " +
          languageInstruction(locale),
      },
      {
        role: "user",
        content: JSON.stringify({
          question,
          memories: memories.map((m) => ({
            id: m.id,
            title: m.title,
            content: m.content,
            category: m.category,
            occurredAt: m.occurredAt,
          })),
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "memory_answer",
        strict: true,
        schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            citedMemoryIds: { type: "array", items: { type: "string" } },
          },
          required: ["answer", "citedMemoryIds"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The memory assistant returned an empty response");
  }

  return answerSchema.parse(JSON.parse(content));
}
