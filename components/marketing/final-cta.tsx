import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <div className="glass-surface flex flex-col items-center gap-5 rounded-3xl border border-border px-8 py-14 text-center shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          Stop planning. Start doing.
        </h2>
        <p className="max-w-md text-muted-foreground">
          Two minutes to your first AI-generated plan. No credit card
          required.
        </p>
        <Button size="lg" asChild>
          <Link href="/sign-up">
            Get started free <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </section>
  );
}
