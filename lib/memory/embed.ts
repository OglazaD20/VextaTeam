import { getOpenAIClient } from "@/lib/ai/client";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions, matches the memories.embedding column

export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}
