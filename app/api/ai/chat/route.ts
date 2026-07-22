import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { runChatTurn } from "@/lib/ai/chat";
import { awardXpAndCheckAchievements } from "@/lib/gamification/engine";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const { data: conversation, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: error?.message ?? "Couldn't start a conversation" },
        { status: 500 },
      );
    }
    conversationId = conversation.id;
  }

  const { data: priorMessages, error: historyError } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  // Tool-call traces stay local to a single turn (see lib/ai/chat.ts) rather
  // than being persisted — the assistant's summary text carries enough
  // context for the next turn without reconstructing tool call/result pairs.
  const history: ChatCompletionMessageParam[] = (priorMessages ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: parsed.data.message });

  const { data: userMessage } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.data.message,
    })
    .select("id")
    .single();

  if (userMessage) {
    await awardXpAndCheckAchievements(supabase, user.id, timeZone, "ai_message_sent", userMessage.id, 2);
  }

  try {
    const finalText = await runChatTurn({ supabase, userId: user.id, timeZone }, history);

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalText,
    });

    return NextResponse.json({ conversationId, message: finalText });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 502 },
    );
  }
}
