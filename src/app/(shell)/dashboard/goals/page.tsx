import Link from "next/link";
import {
  buildLiveTwinWithScores,
  evaluateOrganisationGoals,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  metricsContextFromLiveMetrics,
  suggestedOrganisationGoals,
} from "@dg/platform-core";

import { GoalsBoard } from "@/components/platform/GoalsBoard";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function GoalsPage() {
  const { session } = await getPlatformPageContext();

  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  let progress = [] as ReturnType<typeof evaluateOrganisationGoals>;
  let suggestions = suggestedOrganisationGoals(enabledAppIds, []);

  if (session) {
    const [goals, metrics, connectors] = await Promise.all([
      getOrganisationGoals(session.organisationId),
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    ]);
    const snapshot = metrics
      ? buildLiveTwinWithScores({
          organisationId: session.organisationId,
          organisationName: session.organisationName,
          enabledAppIds,
          metrics,
          connectors,
          profile,
          metricsContext: metricsContextFromLiveMetrics(metrics),
        }).snapshot
      : null;
    progress = evaluateOrganisationGoals(
      goals,
      snapshot,
      enabledAppIds,
      "AUD",
    );
    suggestions = suggestedOrganisationGoals(enabledAppIds, goals);
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Business · Goals
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Goals</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Targets that feed AI Advisor, Overview, and Opportunity ranking. Progress is read from
          the Digital Twin — contacts, consultations, health, and revenue as they move.
        </p>
      </header>
      <main className="dg-page-main">
        {!session ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Sign in with a configured organisation to set goals.
            </p>
          </div>
        ) : (
          <GoalsBoard progress={progress} suggestions={suggestions} />
        )}
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Overview
          </Link>
          {" · "}
          <Link href="/dashboard/twin" className="text-sky-400 hover:underline">
            Digital Twin
          </Link>
          {" · "}
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            Advisor
          </Link>
        </p>
      </main>
    </>
  );
}
