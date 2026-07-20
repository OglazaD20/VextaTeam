import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { generateContextualNotifications } from "@/lib/notifications/generate";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const timeZone = profile?.timezone ?? "UTC";

  // Best-effort: notification generation should never block the page.
  await generateContextualNotifications(supabase, user.id, timeZone).catch(() => {});

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <AppShell
      user={{
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        email: user.email ?? null,
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }}
      notifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}
