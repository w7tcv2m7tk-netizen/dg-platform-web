import { notFound, redirect } from "next/navigation";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

/**
 * Legacy Prospecting audit URL retained for compatibility.
 * Opportunity evidence now lives on the canonical Opportunities tab.
 */
export default async function ProspectingAuditsPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  redirect("/apps/prospecting/scores");
}
