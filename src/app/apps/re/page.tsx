import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { getReDashboardStats,} from "@dg/platform-core";

import { ReDashboard } from "@/components/re/ReDashboard";
import { fetchPortalMe, fetchWpReSummary } from "@/lib/dg-api";
import {
  autoSyncWordPressBuyerLeadsIfNeeded,
  autoSyncWordPressVendorLeadsIfNeeded,
} from "@/lib/wordpress-sync";

export default async function RealEstateOverviewPage() {
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

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Real Estate</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  await Promise.all([
    autoSyncWordPressVendorLeadsIfNeeded(session),
    autoSyncWordPressBuyerLeadsIfNeeded(session),
  ]);

  const [stats, wpSummary] = await Promise.all([
    getReDashboardStats(session.organisationId),
    fetchWpReSummary(30),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Real Estate</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Vendor & buyer pipelines on Platform
        </p>
      </header>
      <main className="dg-page-main">
        <ReDashboard
          stats={stats}
          wpSummary={wpSummary.ok ? wpSummary.data : undefined}
          wpError={wpSummary.ok ? undefined : wpSummary.message}
        />
      </main>
    </>
  );
}
