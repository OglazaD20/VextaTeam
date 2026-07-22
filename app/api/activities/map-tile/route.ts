import { NextResponse } from "next/server";

import { buildGeoapifyTileUrl } from "@/lib/activities/geoapify-client";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STYLES = new Set(["osm-bright", "positron", "dark-matter"]);

// Proxies Geoapify's raster tile API so the API key never reaches the
// client — Leaflet's tileLayer just points at this route with {z}/{x}/{y}
// template placeholders, same never-expose-the-key pattern as static-map.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style") ?? "osm-bright";
  const z = Number(searchParams.get("z"));
  const x = Number(searchParams.get("x"));
  const y = Number(searchParams.get("y"));

  if (!ALLOWED_STYLES.has(style) || !Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return NextResponse.json({ error: "Invalid tile request" }, { status: 400 });
  }

  const tileUrl = buildGeoapifyTileUrl(style, z, x, y);
  const response = await fetch(tileUrl);

  if (!response.ok) {
    return NextResponse.json({ error: "Tile lookup failed" }, { status: 502 });
  }

  const imageBuffer = await response.arrayBuffer();
  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
