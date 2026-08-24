import { redirect } from "next/navigation";
import { canAccessCommandCentre } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Staff on DigitalGate use Command Centre Prospecting — not tenant placeholder pages. */
const STAFF_PROSPECTING_REDIRECTS: Record<string, string> = {
  "/apps/prospecting": "/command/growth-engine",
  "/apps/prospecting/discovery": "/command/growth-engine/discovery",
  "/apps/prospecting/pipeline": "/command/growth-engine/pipeline",
  "/apps/prospecting/activity": "/command/growth-engine/follow-ups",
  "/apps/prospecting/prospects": "/command/growth-engine/discovery",
  "/apps/prospecting/scores": "/command/growth-engine",
};

export async function redirectStaffProspectingIfNeeded(currentPath: string) {
  const target = STAFF_PROSPECTING_REDIRECTS[currentPath];
  if (!target) return;

  const { session } = await getPlatformPageContext();
  if (!session) return;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  if (allowed) redirect(target);
}
