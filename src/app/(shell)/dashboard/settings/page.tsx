import Link from "next/link";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { BusinessProfileCard } from "@/components/platform/BusinessProfileCard";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";

export default async function PlatformSettingsPage() {
  const { email, portal, session } = await getPlatformPageContext();

  const enabledIds = await getOrgEnabledAppIds();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Your organisation, connected services, access and billing
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <BusinessProfileCard
          profile={profile}
          linked={portal?.linked ?? false}
          purchaseLabel={portal?.purchase_label}
        />
        <p className="text-sm text-slate-400">
          <Link href="/dashboard/business" className="text-blue-400 hover:underline">
            Open full Business Profile →
          </Link>
        </p>

        <AppearanceSettings />

        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            href="/dashboard/settings/connected-services"
            className="dg-card block border-sky-500/20 bg-gradient-to-br from-slate-900 to-sky-950/20 hover:border-sky-500/40 lg:col-span-2"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-sky-400">
              Connected Services
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Connect your business</h2>
            <p className="mt-2 text-sm text-slate-400">
              Link the systems you already use. DigitalGate manages the platform infrastructure —
              you connect your mailbox, presence and industry tools here.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-sky-400">
              Manage connected services →
            </span>
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
                  <dt className="text-slate-500">Signed in as</dt>
                  <dd className="text-slate-200">{email}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                Sign in to view organisation details.
              </p>
            )}
            <Link
              href="/dashboard/business"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Edit Business Profile →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Apps</h2>
            <p className="mt-2 text-sm text-slate-400">
              {enabledIds.length} app{enabledIds.length === 1 ? "" : "s"} enabled for your organisation.
            </p>
            <Link
              href="/dashboard/apps"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Manage apps &amp; plan →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Team &amp; access</h2>
            <p className="mt-2 text-sm text-slate-400">
              Manage the people who can access your DigitalGate organisation.
            </p>
            <Link
              href="/dashboard/settings/team"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Manage team →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Billing</h2>
            <p className="mt-2 text-sm text-slate-400">
              Review your plan, subscription and invoices.
            </p>
            <Link
              href="/dashboard/settings/billing"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Billing &amp; invoices →
            </Link>
          </div>

          <div className="dg-card lg:col-span-2">
            <h2 className="font-semibold text-white">More settings</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Link href="/dashboard/settings/notifications" className="text-blue-400 hover:underline">
                Notifications →
              </Link>
              <Link href="/dashboard/settings/security" className="text-blue-400 hover:underline">
                Security →
              </Link>
              <Link href="/dashboard/settings/api" className="text-blue-400 hover:underline">
                API &amp; integration keys →
              </Link>
              <Link href="/dashboard/settings/audit" className="text-blue-400 hover:underline">
                Audit log →
              </Link>
              <Link href="/support" className="text-blue-400 hover:underline">
                Help &amp; support →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
