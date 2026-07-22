import { redirect } from "next/navigation";
import { after } from "next/server";

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

  // Best-effort: runs after the response is sent so it never blocks a page navigation.
  after(() => generateContextualNotifications(supabase, user.id, timeZone).catch(() => {}));

  const [{ data: notifications }, { data: equips }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("user_reward_equips").select("category, reward_id").eq("user_id", user.id),
  ]);

  const equippedThemeId = equips?.find((e) => e.category === "theme")?.reward_id ?? "theme_default";
  const equippedFrameId = equips?.find((e) => e.category === "frame")?.reward_id ?? "frame_none";

  return (
    <AppShell
      user={{
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        email: user.email ?? null,
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }}
      notifications={notifications ?? []}
      equippedThemeId={equippedThemeId}
      equippedFrameId={equippedFrameId}
    >
      {children}
    </AppShell>
  );
}
