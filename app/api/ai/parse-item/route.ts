import { NextResponse } from "next/server";
import { z } from "zod";

import { parseQuickAddText } from "@/lib/ai/parse-quick-add";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ text: z.string().trim().min(1).max(500) });

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

  try {
    const data = await parseQuickAddText(
      parsed.data.text,
      new Date().toISOString(),
      profile?.timezone ?? "UTC",
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI parsing failed" },
      { status: 502 },
    );
  }
}
