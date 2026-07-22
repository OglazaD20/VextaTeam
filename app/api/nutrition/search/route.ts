import { NextResponse } from "next/server";

import { searchFoods } from "@/lib/nutrition/food-search";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const results = await searchFoods(supabase, user.id, query);
    return NextResponse.json({ data: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Food search failed" },
      { status: 502 },
    );
  }
}
