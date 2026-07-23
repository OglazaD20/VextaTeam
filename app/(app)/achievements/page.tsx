import { redirect } from "next/navigation";

/** Folded into the Achievements tab of the unified Analytics Center — this route now just forwards old links/bookmarks there. */
export default function AchievementsPage() {
  redirect("/analytics");
}
