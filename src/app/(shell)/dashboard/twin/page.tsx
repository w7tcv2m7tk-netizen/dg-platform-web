import Link from "next/link";
import {
  buildBusinessOverview,
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  listOrganisationActivities,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
} from "@dg/platform-core";

import { DigitalTwinView } from "@/components/platform/DigitalTwinView";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function DigitalTwinPage() {
  const { user, name, portal, session } = await getPlatformPageContext();
  await ensureOrganisationOnboardingSync();

  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  let context = null;
  let snapshot = null;
  let overview = null;

  if (session) {
    const [metrics, connectors, activities, healthHistory, setupStatus] =
      await Promise.all([
        gatherOverviewLiveMetrics(session.organisationId),
        fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
        listOrganisationActivities({
          organisationId: session.organisationId,
          limit: 8,
        }),
        loadHealthHistory(session.organisationId),
        getPlatformSetupStatus(session.organisationId),
      ]);

    overview = buildBusinessOverview({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      userDisplayName: user?.firstName ?? name,
      enabledAppIds,
      businessProfile: profile,
      setupStatus,
      activities: activities?.items,
      liveMetrics: metrics,
      connectorProbes: connectors,
      healthHistory,
    });

    if (metrics) {
      const live = buildLiveTwinWithScores({
        organisationId: session.organisationId,
        organisationName: session.organisationName,
        enabledAppIds,
        metrics,
        connectors,
        profile,
        metricsContext: metricsContextFromLiveMetrics(metrics),
      });
      snapshot = live.snapshot;
    }

    context = await getBusinessContext({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      twinSnapshot: snapshot,
      profileOverride: profile,
    });
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Business · Digital Twin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Digital Twin</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Live digital state of this business — identity, customers, pipeline, consultations,
          health, and connected systems. Business Profile is what you edit; this is what the
          platform and AI currently know.
        </p>
      </header>
      <main className="dg-page-main">
        {!session || !context ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Sign in with a configured organisation to view the Digital Twin.
            </p>
          </div>
        ) : (
          <DigitalTwinView
            context={context}
            snapshot={snapshot}
            overview={overview}
          />
        )}
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Overview
          </Link>
          {" · "}
          <Link href="/dashboard/business" className="text-sky-400 hover:underline">
            Business Profile
          </Link>
          {" · "}
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            Business Brain
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
