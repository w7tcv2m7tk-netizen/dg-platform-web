import {
  buildBusinessBrain,
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  metricsContextFromLiveMetrics,
} from "@dg/platform-core";

import { BusinessBrainView } from "@/components/platform/BusinessBrainView";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function BusinessBrainPage() {
  const { session } = await getPlatformPageContext();
  await ensureOrganisationOnboardingSync();

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Business Brain</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to view your Digital Business Brain.</p>
        </main>
      </>
    );
  }

  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const [profile, metrics, connectors, setupStatus] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getPlatformSetupStatus(session.organisationId),
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

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot: snapshot,
    profileOverride: profile,
  });

  const brain = buildBusinessBrain({
    context,
    setup: setupStatus,
    connectorCount: context.twin.connectedSystems.length,
  });

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400">
          Business · Business Brain
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Brain</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The knowledge DigitalGate uses across Overview, Advisor, Communications and automation.
        </p>
      </header>
      <main className="dg-page-main">
        <BusinessBrainView brain={brain} />
      </main>
    </>
  );
}
