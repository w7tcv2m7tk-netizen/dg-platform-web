import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";

import { AppsBillingStatusCard } from "@/components/platform/AppsBillingStatusCard";
import { AppsPlanCatalog } from "@/components/platform/AppsPlanCatalog";
import { PostPurchaseSyncBanner } from "@/components/platform/PostPurchaseSyncBanner";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

const DIGITALGATE_WEBSITE = "https://digitalgate.com.au";

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

  return (
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Apps & Platform</h1>
            <p className="text-sm text-slate-400">
              Plan and installed apps for this organisation — same structure as{" "}
              <a
                href={`${DIGITALGATE_WEBSITE}/pricing`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                digitalgate.com.au/pricing
              </a>
              . Billing and subscribe live under Settings → Billing. Discover new apps in Marketplace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
            >
              Billing & invoices
            </a>
            <a
              href={`${DIGITALGATE_WEBSITE}/pricing`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
            >
              Pricing & checkout ↗
            </a>
          </div>
        </div>
      </header>

      <main className="dg-page-main">
        <Suspense fallback={null}>
          <PostPurchaseSyncBanner />
        </Suspense>
        {session ? (
          <AppsBillingStatusCard organisationId={session.organisationId} />
        ) : null}
        <AppsPlanCatalog />
      </main>
    </>
  );
}
