import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";

import { AppsBillingStatusCard } from "@/components/platform/AppsBillingStatusCard";
import { PersonalisedAppsOverview } from "@/components/platform/PersonalisedAppsOverview";
import { PostPurchaseSyncBanner } from "@/components/platform/PostPurchaseSyncBanner";
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
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Apps</h1>
            <p className="text-sm text-slate-400">
              A focused workspace for this business. DigitalGate keeps unrelated industries hidden by default so the platform feels purpose-built for the way you operate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/apps/catalogue"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-blue-500 hover:bg-slate-900 hover:text-white"
            >
              Explore apps
            </a>
            <a
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
            >
              Billing & invoices
            </a>
          </div>
        </div>
      </header>

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
