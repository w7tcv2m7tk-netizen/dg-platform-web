import { auth, currentUser } from "@clerk/nextjs/server";
import { organisationHasWebsitesBuilder } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
export { canRenderStudioContent } from "@/lib/website-studio-publication";

/** Resolve whether the current Clerk session may preview a site's draft state. */
export async function canPreviewWebsiteOrganisation(
  websiteOrganisationId: string,
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await currentUser();
  if (!user) return false;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    email;

  const session = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name,
  });
  if (!session || session.organisationId !== websiteOrganisationId) return false;

  return organisationHasWebsitesBuilder(session.organisationId);
}
