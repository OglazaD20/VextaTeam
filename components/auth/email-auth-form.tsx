"use client";

import { useActionState } from "react";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

import { signInWithEmail, type AuthActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle" };

export function EmailAuthForm({ ctaLabel }: { ctaLabel: string }) {
  const [state, formAction, isPending] = useActionState(
    signInWithEmail,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheckIcon className="size-5" />
        </div>
        <p className="text-sm font-medium">{state.message}</p>
        <p className="text-sm text-muted-foreground">
          You can close this tab once you click the link.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
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
