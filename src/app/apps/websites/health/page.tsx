import { currentUser } from "@clerk/nextjs/server";
import { normalizeSiteHealthSnapshot, resolvePlatformSession } from "@dg/platform-core";

import {
  HealthCentreDashboard,
  HealthCentreError,
} from "@/components/websites/HealthCentreDashboard";
import { fetchPortalMe, fetchWpSiteHealth, getWpConnectorBase } from "@/lib/dg-api";

export default async function WebsiteHealthPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;

  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const connectorBaseUrl = getWpConnectorBase();
  const siteLabel = connectorBaseUrl.replace(/\/wp-json.*/, "") || "roerealty.com.au";

  const healthResult = await fetchWpSiteHealth();

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Website Health Centre</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · read-only
        </p>
      </header>
      <main className="flex-1 p-8">
        {healthResult.ok ? (
          <HealthCentreDashboard
            snapshot={normalizeSiteHealthSnapshot(healthResult.payload)}
            connectorBaseUrl={connectorBaseUrl}
          />
        ) : (
          <HealthCentreError
            code={healthResult.code}
            message={healthResult.message}
            connectorBaseUrl={connectorBaseUrl}
          />
        )}
      </main>
    </>
  );
}
