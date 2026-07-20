import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { computeHabitSignals } from "@/lib/habits/insights";
import { createClient } from "@/lib/supabase/server";

const recommendationsSchema = z.object({
  recommendations: z.array(
    z.object({
      habitId: z.string(),
      message: z.string().max(200),
    }),
  ),
});

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, cadence, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .is("paused_at", null);

  if (habitsError) {
    return NextResponse.json({ error: habitsError.message }, { status: 500 });
  }

  if (!habits || habits.length === 0) {
    return NextResponse.json({ data: { recommendations: [] } });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);

  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("habit_id, logged_for_date, completed")
    .eq("user_id", user.id)
    .gte("logged_for_date", thirtyDaysAgo.toISOString().slice(0, 10));

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!log.completed) continue;
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.logged_for_date);
  }

  const signals = computeHabitSignals(
    habits.map((h) => ({
      id: h.id,
      name: h.name,
      cadence: h.cadence,
      createdAt: h.created_at,
    })),
    logsByHabit,
    timeZone,
  ).slice(0, 5);

  if (signals.length === 0) {
    return NextResponse.json({ data: { recommendations: [] } });
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL_FAST,
      messages: [
        {
          role: "system",
          content:
            "You write short, encouraging habit-coaching notes for a daily planner app, based on precomputed statistics. Never invent numbers not given to you. One sentence per habit, specific and actionable, under 25 words, second person, no guilt-tripping.",
        },
        { role: "user", content: JSON.stringify({ signals }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "habit_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    habitId: { type: "string" },
                    message: { type: "string" },
                  },
                  required: ["habitId", "message"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("The AI insights call returned an empty response");
    }

    const data = recommendationsSchema.parse(JSON.parse(content));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI insights failed" },
      { status: 502 },
    );
  }
}
