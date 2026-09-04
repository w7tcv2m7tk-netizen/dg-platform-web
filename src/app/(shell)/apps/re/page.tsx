import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { getReDashboardStats } from "@dg/platform-core";

import { ReDashboard } from "@/components/re/ReDashboard";
import { fetchPortalMe } from "@/lib/dg-api";

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

  const stats = await getReDashboardStats(session.organisationId);

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session.organisationName} · Vendor & buyer pipelines · Platform Core / Neon · Beta
      </p>
      <ReDashboard stats={stats} />
    </main>
  );
}
