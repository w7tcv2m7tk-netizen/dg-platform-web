import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession, syncOrganisationFromPortal } from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";

/** Pull onboarding submission from WordPress into Postgres org settings (throttled). */
export async function ensureOrganisationOnboardingSync(force = false) {
  const user = await currentUser();
  if (!user?.id) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user.id) : null;
  const session = await resolvePlatformSession({
    clerkUserId: user.id,
    email,
    name,
    orgName: portal?.org_name,
  });

  if (!session || !portal?.linked) return null;

  return syncOrganisationFromPortal({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    portal,
    force,
  });
}
