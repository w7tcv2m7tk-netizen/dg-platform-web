import { syncOrganisationFromPortal } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

/** Pull onboarding submission from WordPress into Postgres org settings (throttled). */
export async function ensureOrganisationOnboardingSync(force = false) {
  const { session, portal } = await getPlatformPageContext();

  if (!session || !portal?.linked) return null;

  return syncOrganisationFromPortal({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    portal,
    force,
  });
}
