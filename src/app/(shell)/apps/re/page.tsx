import { getReDashboardStats } from "@dg/platform-core";

import { ReDashboard } from "@/components/re/ReDashboard";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function RealEstateOverviewPage() {
  const { session } = await getPlatformPageContext();

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
        {session.organisationName} · Vendor & buyer pipelines · Beta
      </p>
      <ReDashboard stats={stats} />
    </main>
  );
}
