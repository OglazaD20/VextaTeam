import { randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getGoogleCalendarAuthUrl } from "@/lib/calendar/google";
import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "google_calendar_oauth_state";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", await getOrigin()));
  }

  const origin = await getOrigin();
  const redirectUri = `${origin}/api/calendar/google/callback`;
  const state = randomBytes(24).toString("base64url");

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getGoogleCalendarAuthUrl(redirectUri, state));
}
