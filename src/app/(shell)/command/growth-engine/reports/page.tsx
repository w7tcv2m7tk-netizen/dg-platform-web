import { redirect } from "next/navigation";

/** Canonical Reports live under Prospecting — keep this path for bookmarks. */
export default function GrowthReportsRedirectPage() {
  redirect("/apps/prospecting/reports");
}
