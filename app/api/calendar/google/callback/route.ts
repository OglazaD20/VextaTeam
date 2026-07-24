import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeCodeForTokens, fetchGoogleAccountEmail } from "@/lib/calendar/google";
import { encryptSecret } from "@/lib/security/encryption";
import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "google_calendar_oauth_state";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function GET(request: Request) {
  const origin = await getOrigin();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/settings?calendar_error=${encodeURIComponent(reason)}`);

  if (oauthError) return fail(oauthError);
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);

  try {
    const redirectUri = `${origin}/api/calendar/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Google omits refresh_token on repeat consents without prompt=consent;
      // we always pass prompt=consent, so this should be rare.
      return fail("no_refresh_token");
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);

    const { error } = await supabase.from("calendar_connections").upsert(
      {
        user_id: user.id,
        provider: "google",
        account_email: email,
        access_token_encrypted: encryptSecret(tokens.access_token),
        refresh_token_encrypted: encryptSecret(tokens.refresh_token),
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope.split(" "),
        sync_status: "active",
      },
      { onConflict: "user_id,provider,account_email" },
    );

    if (error) return fail(error.message);

    return NextResponse.redirect(`${origin}/settings?calendar=connected`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "unknown_error");
  }
}
