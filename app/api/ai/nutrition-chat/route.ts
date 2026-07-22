import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { runNutritionChatTurn } from "@/lib/ai/nutrition-chat";
import { awardXpAndCheckAchievements } from "@/lib/gamification/engine";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";

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
      .insert({ user_id: user.id, kind: "nutrition" })
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
    const locale = await getLocale();
    const result = await runNutritionChatTurn({ supabase, userId: user.id, timeZone, locale }, history);

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: result.reply,
    });

    return NextResponse.json({ conversationId, message: result.reply, foodSummary: result.foodSummary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 502 },
    );
  }
}
