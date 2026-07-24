"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDictionary } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().email();

export interface AuthActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

function buildCallbackUrl(origin: string, redirectTo: string | null): string {
  const url = new URL(`${origin}/auth/callback`);
  if (redirectTo && redirectTo.startsWith("/")) {
    url.searchParams.set("redirectTo", redirectTo);
  }
  return url.toString();
}

/** Supabase's auth error messages come back in English regardless of the app's language — map the common ones to a translated message rather than showing raw English in a localized UI. */
function translateAuthError(message: string, t: Awaited<ReturnType<typeof getDictionary>>["t"]): string {
  if (/rate limit/i.test(message)) return t.auth.rateLimitError;
  return t.auth.genericAuthError;
}

export async function signInWithEmail(
  redirectTo: string | null,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { t } = await getDictionary();

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: t.auth.invalidEmail };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: buildCallbackUrl(origin, redirectTo),
    },
  });

  if (error) {
    return { status: "error", message: translateAuthError(error.message, t) };
  }

  return {
    status: "success",
    message: t.auth.checkYourEmail,
  };
}

export async function signInWithGoogle(redirectTo: string | null) {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildCallbackUrl(origin, redirectTo),
    },
  });

  if (error || !data.url) {
    redirect("/sign-in?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
