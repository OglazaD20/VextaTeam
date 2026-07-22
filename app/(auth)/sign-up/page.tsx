import Link from "next/link";
import type { Metadata } from "next";

import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Separator } from "@/components/ui/separator";
import { getDictionary } from "@/lib/i18n/get-locale";

export const metadata: Metadata = { title: "Create your account — LifeFlow" };

export default async function SignUpPage() {
  const { t } = await getDictionary();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t.auth.signUpTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.signUpSubtitle}</p>
      </div>

      <GoogleAuthButton />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t.auth.or}</span>
        <Separator className="flex-1" />
      </div>

      <EmailAuthForm ctaLabel={t.auth.createAccount} />

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.alreadyHaveAccount}{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.auth.signIn}
        </Link>
      </p>
    </div>
  );
}
