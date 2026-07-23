import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { runTutorChatTurn } from "@/lib/ai/tutor-chat";
import { awardXpAndCheckAchievements } from "@/lib/gamification/engine";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
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
      .insert({ user_id: user.id, kind: "tutor" })
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

  let courseContext = null;
  if (parsed.data.courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id, title, subject")
      .eq("id", parsed.data.courseId)
      .eq("user_id", user.id)
      .single();

    if (course) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title")
        .eq("course_id", course.id)
        .order("sort_order", { ascending: true });

      courseContext = { id: course.id, title: course.title, subject: course.subject, lessons: lessons ?? [] };
    }
  }

  try {
    const locale = await getLocale();
    const reply = await runTutorChatTurn(
      { supabase, userId: user.id, timeZone, locale },
      history,
      courseContext,
    );

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    });

    return NextResponse.json({ conversationId, message: reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 502 },
    );
  }
}
