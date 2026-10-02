import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";

import { AppsBillingStatusCard } from "@/components/platform/AppsBillingStatusCard";
import { PersonalisedAppsOverview } from "@/components/platform/PersonalisedAppsOverview";
import { PostPurchaseSyncBanner } from "@/components/platform/PostPurchaseSyncBanner";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";

export default async function AppsPage() {
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
  const industrySelectionIds = session ? await getOrgIndustrySelectionIdsCached() : [];

  return (
    <>
      <SectionPageHeader section="Configuration" title="Your Apps" description="A focused workspace for this business. DigitalGate keeps unrelated industries hidden by default so the platform feels purpose-built for the way you operate." />

      <main className="dg-page-main space-y-6">
        <Suspense fallback={null}>
          <PostPurchaseSyncBanner />
        </Suspense>
        {session ? (
          <AppsBillingStatusCard organisationId={session.organisationId} />
        ) : null}
        <PersonalisedAppsOverview
          industrySelectionIds={industrySelectionIds}
          organisationName={session?.organisationName}
        />
      </main>
    </>
  );
}
