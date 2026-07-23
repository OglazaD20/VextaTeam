import { redirect } from "next/navigation";

/** Folded into the Productivity tab of the unified Analytics Center — this route now just forwards old links/bookmarks there. */
export default function StatsPage() {
  redirect("/analytics");
}
