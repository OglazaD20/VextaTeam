import Link from "next/link";

import { I18nProvider } from "@/components/i18n/i18n-provider";
import { Logo } from "@/components/shared/logo";
import { getLocale } from "@/lib/i18n/get-locale";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <I18nProvider initialLocale={locale}>
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
    </I18nProvider>
  );
}
