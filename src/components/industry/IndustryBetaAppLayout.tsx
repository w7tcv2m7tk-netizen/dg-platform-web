import { organisationHasIndustryAppBeta, shouldShowIndustryApp } from "@dg/platform-core";
import Link from "next/link";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getOrgIndustrySelectionIdsCached } from "@/lib/org-apps";

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

  if (!session || !process.env.DATABASE_URL) {
    return children;
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

  if (allowed && selectedForOrganisation) return children;

  if (allowed && !selectedForOrganisation) {
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
