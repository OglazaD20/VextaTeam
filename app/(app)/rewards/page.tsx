import { redirect } from "next/navigation";

/** Merged into Achievements — cosmetic rewards are now shown and equipped directly from each achievement, plus a "Your Collection" section on the Achievements tab. This route now just forwards old links/bookmarks there. */
export default function RewardsPage() {
  redirect("/analytics");
}
