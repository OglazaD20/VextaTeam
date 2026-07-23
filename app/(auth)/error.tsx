"use client";

import Link from "next/link";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

import { useTranslations } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { messages } = useTranslations();

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-5" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">
        {error.message || messages.auth.somethingWentWrong}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          <RotateCcwIcon className="size-3.5" /> {messages.auth.tryAgain}
        </Button>
        <Button size="sm" asChild>
          <Link href="/sign-in">{messages.auth.backToSignIn}</Link>
        </Button>
      </div>
    </div>
  );
}
