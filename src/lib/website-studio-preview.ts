import { auth, currentUser } from "@clerk/nextjs/server";
import { organisationHasWebsitesBuilder } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export type StudioPublicationState = {
  siteStatus?: string | null;
  pageStatus?: string | null;
  previewRequested: boolean;
  previewAuthorised: boolean;
};

/**
 * Public traffic may render only published Studio content. Draft content is
 * available exclusively to an authenticated editor whose active organisation
 * owns the website and has Website Builder access.
 */
export function canRenderStudioContent(state: StudioPublicationState): boolean {
  if (state.previewRequested && state.previewAuthorised) return true;
  if (state.siteStatus !== "published") return false;
  if (state.pageStatus && state.pageStatus !== "published") return false;
  return true;
}

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
