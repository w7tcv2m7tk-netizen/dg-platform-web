import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getOrganisationBusinessProfile,
  resolvePlatformSession,
} from "@dg/platform-core";

import { BusinessProfileCard } from "@/components/platform/BusinessProfileCard";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
export default async function PlatformSettingsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  await ensureOrganisationOnboardingSync();
  const session = user?.id    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const enabledIds = await getOrgEnabledAppIds();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  return (    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Organisation, connectors, and platform configuration
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <BusinessProfileCard
          profile={profile}
          linked={portal?.linked ?? false}
          purchaseLabel={portal?.purchase_label}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            href="/dashboard/settings/api"
            className="dg-card block border-blue-500/20 bg-gradient-to-br from-slate-900 to-blue-950/20 hover:border-blue-500/40 lg:col-span-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-blue-400">API</p>
            <h2 className="mt-2 text-lg font-semibold text-white">REST API &amp; integration keys</h2>
            <p className="mt-2 text-sm text-slate-400">
              Create <code className="text-slate-300">dg_live_</code> keys for CRM, leads, commerce, and
              automations. Base URL: <code className="text-slate-300">/api/v1</code>
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-400">Manage API keys →</span>
          </Link>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Organisation</h2>
            {session ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="text-slate-200">{session.organisationName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Slug</dt>
                  <dd className="font-mono text-slate-300">{session.organisationSlug}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Signed in as</dt>
                  <dd className="text-slate-200">{email}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                Sign in with DATABASE_URL configured to view organisation details.
              </p>
            )}
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Apps</h2>
            <p className="mt-2 text-sm text-slate-400">
              {enabledIds.length} app{enabledIds.length === 1 ? "" : "s"} enabled for your
              organisation sidebar.
            </p>
            <Link
              href="/dashboard/apps"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Manage apps & plan →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Setup</h2>
            <p className="mt-2 text-sm text-slate-400">
              Self-serve checklist for CRM, connectors, and first workflows.
            </p>
            <Link
              href="/dashboard/apps#onboarding"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Open setup checklist →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Quick links</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/dashboard/settings/api" className="text-blue-400 hover:underline">
                  API →
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
                  Connectors →
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings/team" className="text-blue-400 hover:underline">
                  Team & access →
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings/audit" className="text-blue-400 hover:underline">
                  Audit log →
                </Link>
              </li>
              <li>
                <Link href="/dashboard/settings/roadmap" className="text-blue-400 hover:underline">
                  Roadmap →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
