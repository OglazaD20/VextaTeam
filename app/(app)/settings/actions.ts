"use server";

import { revalidatePath } from "next/cache";

import { revokeGoogleToken } from "@/lib/calendar/google";
import { decryptSecret } from "@/lib/security/encryption";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export async function disconnectCalendar(connectionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("access_token_encrypted")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connection?.access_token_encrypted) {
    await revokeGoogleToken(decryptSecret(connection.access_token_encrypted));
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return {};
}
