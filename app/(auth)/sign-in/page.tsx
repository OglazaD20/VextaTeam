import Link from "next/link";
import type { Metadata } from "next";

import { AuthErrorBanner } from "@/components/auth/auth-error-banner";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Separator } from "@/components/ui/separator";
import { getDictionary } from "@/lib/i18n/get-locale";

export const metadata: Metadata = { title: "Sign in — LifeFlow" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { t } = await getDictionary();
  const { error, redirectTo } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t.auth.signInTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.signInSubtitle}</p>
      </div>

      <AuthErrorBanner error={error} />

      <GoogleAuthButton redirectTo={redirectTo} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t.auth.or}</span>
        <Separator className="flex-1" />
      </div>

      <EmailAuthForm ctaLabel={t.auth.sendMagicLink} redirectTo={redirectTo} />

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.newToLifeFlow}{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.auth.createAnAccount}
        </Link>
      </p>
    </div>
  );
}
