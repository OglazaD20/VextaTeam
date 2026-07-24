import { NextResponse } from "next/server";

import { buildStaticMapUrl } from "@/lib/activities/geoapify-client";
import { createClient } from "@/lib/supabase/server";

// Proxies Geoapify's Static Maps API so the API key never reaches the client
// (an <img src> pointing straight at Geoapify would leak it in page source).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const mapUrl = buildStaticMapUrl({ lat, lng });
  const response = await fetch(mapUrl);

  if (!response.ok) {
    return NextResponse.json({ error: "Map lookup failed" }, { status: 502 });
  }

  const imageBuffer = await response.arrayBuffer();
  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
