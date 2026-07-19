import OpenAI from "openai";

import { env } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. AI features are unavailable until it's configured.",
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  return client;
}

/** Cheaper/faster model for high-frequency, low-complexity calls (parsing, estimation). */
export const AI_MODEL_FAST = "gpt-4o-mini";
