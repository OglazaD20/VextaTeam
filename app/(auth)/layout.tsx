import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_60%)]"
      />
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="mx-auto">
          <Logo />
        </Link>
        <div className="animate-slide-up rounded-2xl border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
