"use client";

import { useActionState } from "react";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

import { signInWithEmail, type AuthActionState } from "@/app/(auth)/actions";
import { useTranslations } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle" };

export function EmailAuthForm({ ctaLabel }: { ctaLabel: string }) {
  const [state, formAction, isPending] = useActionState(
    signInWithEmail,
    initialState,
  );
  const { messages } = useTranslations();

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheckIcon className="size-5" />
        </div>
        <p className="text-sm font-medium">{state.message}</p>
        <p className="text-sm text-muted-foreground">{messages.auth.closeTabHint}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{messages.auth.emailAddress}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={messages.auth.emailPlaceholder}
          autoComplete="email"
          required
        />
      </div>
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2Icon className="animate-spin" />}
        {ctaLabel}
      </Button>
    </form>
  );
}
