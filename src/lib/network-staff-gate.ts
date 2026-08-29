import { canAccessCommandCentre } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PlatformHubPage } from "@/components/platform/PlatformHubPage";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

async function requireStaffNetwork() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const staff =
    session &&
    canAccessCommandCentre({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      organisationSlug: session.organisationSlug,
      role: session.role,
    });

  return { session, staff: Boolean(staff) };
}

/** Staff-only Network surfaces — customers are redirected to the slim Network. */
export async function redirectUnlessStaffNetwork(customerHref = "/dashboard/network") {
  const { staff } = await requireStaffNetwork();
  if (!staff) redirect(customerHref);
}

export { PlatformHubPage, requireStaffNetwork };
