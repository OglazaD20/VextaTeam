import { AlertTriangleIcon } from "lucide-react";

import { getDictionary } from "@/lib/i18n/get-locale";

/** Surfaces the `?error=` query param the callback route sets on an expired/invalid magic link or a failed Google sign-in — previously silently dropped, leaving the user on a blank sign-in page with no explanation. */
export async function AuthErrorBanner({ error }: { error?: string }) {
  if (!error) return null;

  const { t } = await getDictionary();
  const message = error === "oauth" ? t.auth.oauthError : t.auth.linkExpiredError;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
