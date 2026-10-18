import { organisationHasIndustryAppBeta, shouldShowIndustryApp } from "@dg/platform-core";
import Link from "next/link";
import { IndustrySectionIdentity } from "@/components/industry/IndustrySectionIdentity";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";
import { resolveSelectedIndustryIdentity } from "@/lib/industry-app-identity";
import { industryAppAccessDecision } from "@dg/platform-core/industry/purchase-authority";
import type { IndustryPurchaseAuthority } from "@dg/platform-core/industry/purchase-authority";

/**
 * Shared industry beta layout gate — route/direct URL same as nav + API.
 */
export async function IndustryBetaAppLayout({
  appId,
  title,
  children,
}: {
  appId: string;
  title: string;
  children: React.ReactNode;
}) {
  const { session } = await getPlatformPageContext();

  if (!session || !process.env.DATABASE_URL) return <AccessClosed title={title} />;

  let authority: IndustryPurchaseAuthority | null = null;
  try {
    const { prisma } = await import("@dg/database");
    authority = await prisma.platformSubscription.findUnique({
      where: { organisationId: session.organisationId },
      select: { organisationId: true, industryApps: true, premiumApps: true, status: true, entitlement: true, stripeStatus: true,
        stripeSubscriptionId: true, stripeCustomerId: true, trialEnd: true, currentPeriodEnd: true, gracePeriodEndsAt: true, cancelAtPeriodEnd: true },
    });
  } catch {
    return <AccessClosed title={title} />;
  }
  const [allowed, industrySelectionIds] = await Promise.all([
    organisationHasIndustryAppBeta(session.organisationId, appId),
    getOrgIndustrySelectionIdsCached(),
  ]);
  const selectedForOrganisation = shouldShowIndustryApp(
    appId,
    {
      gen2Onboarding: {
        operatingProfile: {
          templates: industrySelectionIds,
        },
      },
    },
  );
  const accessDecision = industryAppAccessDecision({
    authority,
    organisationId: session.organisationId,
    appId,
    betaEnrolled: allowed,
    selectedForOrganisation,
  });

  if (accessDecision === "allowed") {
    const identity = resolveSelectedIndustryIdentity(appId, industrySelectionIds, title);
    return <><IndustrySectionIdentity mount={appId} appName={identity.title} />{children}</>;
  }

  if (accessDecision === "industry_app_not_selected") {
    return (
      <main className="dg-page-main">
        <div className="dg-card space-y-3">
          <p className="font-medium text-white">App not active for this business</p>
          <p className="text-sm text-slate-400">
            {title} is not one of the business types selected for this organisation.
          </p>
          <Link
            href="/dashboard/apps"
            className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
          >
            ← Back to Apps
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dg-page-main">
      <div className="dg-card space-y-3">
        <p className="font-medium text-white">Closed beta</p>
        <p className="text-sm text-slate-400">
          {title} is enrolled per organisation via feature flags — not open to every customer by
          default. Ask DigitalGate to enable the beta for this workspace.
        </p>
        <p className="text-xs text-slate-500">{session.organisationName}</p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
        >
          ← Back to Priorities
        </Link>
      </div>
    </main>
  );
}

function AccessClosed({ title }: { title: string }) {
  return <main className="dg-page-main"><div className="dg-card space-y-3">
    <p className="font-medium text-white">Industry App access unavailable</p>
    <p className="text-sm text-slate-400">{title} requires a verified subscription entitlement and organisation beta access.</p>
    <Link href="/dashboard/apps" className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline">← Back to Apps</Link>
  </div></main>;
}
