import Link from "next/link";
import type { Metadata } from "next";

import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Create your account — LifeFlow" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Let LifeFlow plan your day
        </h1>
        <p className="text-sm text-muted-foreground">
          No credit card. Two minutes to your first AI-generated plan.
        </p>
      </div>

      <GoogleAuthButton />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <EmailAuthForm ctaLabel="Create account" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
