import type { createClient } from "@/lib/supabase/server";
import type { MemorySourceType } from "@/types/database";
import { embedText } from "./embed";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface MemoryInput {
  userId: string;
  sourceType: MemorySourceType;
  sourceId: string | null;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[];
  occurredAt?: string;
}

/**
 * Records a memory for AI Memory's semantic search — embeds the title+content
 * and upserts (one row per user+source_type+source_id, so re-saving/editing
 * the same item updates rather than duplicates). Best-effort: never throws,
 * since capturing a memory should never break the action that created the
 * underlying task/goal/transaction/etc.
 */
export async function recordMemory(supabase: SupabaseServerClient, input: MemoryInput): Promise<void> {
  try {
    const embedding = await embedText(`${input.title}\n${input.content}`);

    const query = supabase.from("memories").upsert(
      {
        user_id: input.userId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        title: input.title,
        content: input.content,
        category: input.category ?? null,
        tags: input.tags ?? [],
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        embedding,
      },
      input.sourceId ? { onConflict: "user_id,source_type,source_id" } : undefined,
    );

    await query;
  } catch {
    // See doc comment — best-effort.
  }
}

/** Best-effort deletion when the underlying source record is deleted. */
export async function deleteMemoryForSource(
  supabase: SupabaseServerClient,
  userId: string,
  sourceType: MemorySourceType,
  sourceId: string,
): Promise<void> {
  try {
    await supabase
      .from("memories")
      .delete()
      .eq("user_id", userId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId);
  } catch {
    // Best-effort — see recordMemory.
  }
}
