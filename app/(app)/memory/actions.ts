"use server";

import { revalidatePath } from "next/cache";

import { generateMemoryAnswer, type RetrievedMemory } from "@/lib/ai/generate-memory-answer";
import { embedText } from "@/lib/memory/embed";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import type { Tables } from "@/types/database";
import { askMemorySchema, searchMemorySchema, type AskMemoryInput, type SearchMemoryInput } from "./schema";

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

  return { supabase, user };
}

function revalidateMemory() {
  revalidatePath("/memory");
}

export async function getMemoryTimeline(
  filters: { category?: string; pinnedOnly?: boolean; favoritedOnly?: boolean } = {},
): Promise<ActionResult<Tables<"memories">[]>> {
  const { supabase, user } = await requireUser();

  let query = supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.pinnedOnly) query = query.eq("pinned", true);
  if (filters.favoritedOnly) query = query.eq("favorited", true);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data ?? [] };
}

export async function getMemoryCategories(): Promise<ActionResult<string[]>> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("memories")
    .select("category")
    .eq("user_id", user.id)
    .not("category", "is", null);

  if (error) return { error: error.message };
  const unique = [...new Set((data ?? []).map((m) => m.category).filter((c): c is string => !!c))];
  return { data: unique.sort() };
}

export async function searchMemories(
  input: SearchMemoryInput,
): Promise<ActionResult<(Tables<"memories"> & { similarity: number })[]>> {
  const parsed = searchMemorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();

  let embedding: number[];
  try {
    embedding = await embedText(parsed.data.query);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't search your memories" };
  }

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: embedding,
    match_user_id: user.id,
    match_count: 20,
  });

  if (error) return { error: error.message };

  return {
    data: (data ?? []).map((m) => ({
      id: m.id,
      user_id: user.id,
      source_type: m.source_type,
      source_id: m.source_id,
      title: m.title,
      content: m.content,
      summary: m.summary,
      category: m.category,
      tags: m.tags,
      embedding: null,
      pinned: m.pinned,
      favorited: m.favorited,
      occurred_at: m.occurred_at,
      created_at: m.occurred_at,
      similarity: m.similarity,
    })),
  };
}

export interface AskMemoryResult {
  answer: string;
  citedMemories: RetrievedMemory[];
}

export async function askMemory(input: AskMemoryInput): Promise<ActionResult<AskMemoryResult>> {
  const parsed = askMemorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { supabase, user } = await requireUser();

  let embedding: number[];
  try {
    embedding = await embedText(parsed.data.question);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't search your memories" };
  }

  const { data: matches, error } = await supabase.rpc("match_memories", {
    query_embedding: embedding,
    match_user_id: user.id,
    match_count: 8,
  });

  if (error) return { error: error.message };

  const retrieved: RetrievedMemory[] = (matches ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    category: m.category,
    occurredAt: m.occurred_at,
    similarity: m.similarity,
  }));

  if (retrieved.length === 0) {
    return { data: { answer: "I don't have any memories that match that yet.", citedMemories: [] } };
  }

  try {
    const locale = await getLocale();
    const result = await generateMemoryAnswer(parsed.data.question, retrieved, locale);
    const cited = retrieved.filter((m) => result.citedMemoryIds.includes(m.id));
    return { data: { answer: result.answer, citedMemories: cited.length > 0 ? cited : retrieved.slice(0, 3) } };
  } catch (aiError) {
    return { error: aiError instanceof Error ? aiError.message : "Couldn't answer that" };
  }
}

export async function getRelatedMemories(
  memoryId: string,
): Promise<ActionResult<{ id: string; title: string; content: string; category: string | null; occurredAt: string; similarity: number }[]>> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("match_related_memories", {
    target_memory_id: memoryId,
    match_count: 5,
  });

  if (error) return { error: error.message };
  return {
    data: (data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      category: m.category,
      occurredAt: m.occurred_at,
      similarity: m.similarity,
    })),
  };
}

export async function toggleMemoryPinned(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: memory } = await supabase.from("memories").select("pinned").eq("id", id).eq("user_id", user.id).single();
  if (!memory) return { error: "Memory not found" };

  const { error } = await supabase.from("memories").update({ pinned: !memory.pinned }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateMemory();
  return {};
}

export async function toggleMemoryFavorited(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: memory } = await supabase.from("memories").select("favorited").eq("id", id).eq("user_id", user.id).single();
  if (!memory) return { error: "Memory not found" };

  const { error } = await supabase
    .from("memories")
    .update({ favorited: !memory.favorited })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateMemory();
  return {};
}

export async function deleteMemory(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("memories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateMemory();
  return {};
}
