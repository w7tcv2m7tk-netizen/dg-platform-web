import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  captureDigitalTwinSnapshot,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,
} from "@dg/platform-core";

import { BusinessProfileEditor } from "@/components/platform/BusinessProfileEditor";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{
    reOnboarding?: string;
    focus?: string;
    intent?: string;
    from?: string;
  }>;
}) {
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

  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;
  const params = searchParams ? await searchParams : undefined;
  const reOnboarding = params?.reOnboarding === "1";
  const focusBrand = params?.focus === "brand";
  const brandIntent = params?.intent ?? null;

  let context = null;
  if (session) {
    const [metrics, connectors] = await Promise.all([
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    ]);
    const twinSnapshot = metrics
      ? captureDigitalTwinSnapshot({
          organisationId: session.organisationId,
          organisationName: session.organisationName,
          enabledAppIds,
          metrics,
          connectors,
          profile,
        })
      : null;
    context = await getBusinessContext({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      twinSnapshot,
      profileOverride: profile,
    });
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Business Profile</h1>
        <p className="text-sm text-slate-400">
          Your Digital Business Identity — the foundation every app and AI capability references.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Launching a new business?{" "}
          <Link href="/dashboard/business-setup" className="text-sky-400 hover:underline">
            Start Your Business
          </Link>{" "}
          (Business Setup checklist).
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {reOnboarding ? (
          <section className="dg-card border border-sky-500/30 bg-sky-500/5">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
              Real Estate beta onboarding
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Welcome — finish these steps next
            </h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>
                <Link
                  href="/dashboard/business-setup#identify"
                  className="text-sky-400 hover:underline"
                >
                  Verify ABN
                </Link>{" "}
                on Start Your Business, then confirm logo on this profile
              </li>
              <li>
                <Link
                  href="/dashboard/settings/connectors"
                  className="text-sky-400 hover:underline"
                >
                  Connect WordPress
                </Link>{" "}
                for your agency site
              </li>
              <li>
                <Link
                  href="/dashboard/team"
                  className="text-sky-400 hover:underline"
                >
                  Invite teammates
                </Link>
              </li>
              <li>
                Land on{" "}
                <Link href="/apps/re" className="text-sky-400 hover:underline">
                  Real Estate
                </Link>{" "}
                and add your first vendor lead
              </li>
            </ol>
          </section>
        ) : null}

        {!session || !context ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Sign in with a configured organisation to manage your Business Profile.
            </p>
          </div>
        ) : (
          <BusinessProfileEditor
            profile={profile}
            context={context}
            linked={portal?.linked ?? false}
            focusBrand={focusBrand}
            brandIntent={brandIntent}
          />
        )}
      </main>
    </>
  );
}
