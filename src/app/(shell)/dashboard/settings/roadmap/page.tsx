import { canAccessCommandCentre } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

/** Roadmap lives under Product (staff) — not customer Platform Settings. */
export default async function SettingsRoadmapRedirectPage() {
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

  if (
    session &&
    canAccessCommandCentre({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      organisationSlug: session.organisationSlug,
      role: session.role,
    })
  ) {
    redirect("/command/product/roadmap");
  }

  redirect("/dashboard/settings");
}
