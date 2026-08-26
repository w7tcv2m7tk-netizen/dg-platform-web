import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { getReDashboardStats, organisationHasWordPressConnector } from "@dg/platform-core";

import { ReDashboard } from "@/components/re/ReDashboard";
import { fetchPortalMe, fetchWpReSummary } from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";
import {
  autoSyncWordPressBuyerLeadsIfNeeded,
  autoSyncWordPressBookingsIfNeeded,
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
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  await Promise.all([
    autoSyncWordPressVendorLeadsIfNeeded(session),
    autoSyncWordPressBuyerLeadsIfNeeded(session),
    autoSyncWordPressBookingsIfNeeded(session),
  ]);

  const [stats, wpSummary, wpConfigured] = await Promise.all([
    getReDashboardStats(session.organisationId),
    wpConnectorForOrg(session.organisationId).then((connector) =>
      fetchWpReSummary(30, connector),
    ),
    organisationHasWordPressConnector(session.organisationId),
  ]);

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session.organisationName} · Vendor & buyer pipelines · Beta
      </p>
      <ReDashboard
        stats={stats}
        wpSummary={wpSummary.ok ? wpSummary.data : undefined}
        wpError={wpSummary.ok ? undefined : wpSummary.message}
        showWordPress={wpConfigured}
      />
    </main>
  );
}
