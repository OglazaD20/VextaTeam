import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AppShell
      user={{
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        email: user.email ?? null,
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
