import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getPlatformSetupStatus, resolvePlatformSession } from "@dg/platform-core";

import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";
import { PlatformRoadmapPanel } from "@/components/platform/PlatformRoadmapPanel";
import { PlatformSetupChecklist } from "@/components/PlatformSetupChecklist";
import { SupportActions } from "@/components/SupportActions";

export default async function DashboardPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const clerkUserId = user?.id;
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const platformSession =
    clerkUserId && email
      ? await resolvePlatformSession({
          clerkUserId,
          email,
          name,
        })
      : null;

  const setupStatus = platformSession
    ? await getPlatformSetupStatus(platformSession.organisationId)
    : null;

  const displayName =
    user?.firstName || user?.fullName || email.split("@")[0] || "there";

  return (
    <>
      <PlatformRoadmapBar />
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400">
          Welcome back, {displayName}
          {email ? ` · ${email}` : ""}
          {platformSession ? ` · ${platformSession.organisationName}` : ""}
        </p>
        {platformSession ? (
          <p className="mt-1 text-xs text-emerald-400/90">
            Platform org: {platformSession.organisationSlug} (Postgres)
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-300/90">
            Database not configured — set DATABASE_URL to enable CRM.
          </p>
        )}
      </header>
      <main className="flex-1 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">CRM</h2>
              <p className="mt-1 text-sm text-slate-400">
                Contacts live in Platform Postgres for{" "}
                {platformSession.organisationName}.
              </p>
              <Link
                href="/apps/crm/contacts"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open contacts →
              </Link>
            </div>
          ) : null}
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">Real Estate</h2>
              <p className="mt-1 text-sm text-slate-400">
                Vendor pipeline, appraisals, and listings on Platform.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link href="/apps/re/vendor-leads" className="text-blue-400 hover:underline">
                  Vendor leads →
                </Link>
                <Link href="/apps/re/properties" className="text-blue-400 hover:underline">
                  Properties →
                </Link>
              </div>
            </div>
          ) : null}
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">Websites</h2>
              <p className="mt-1 text-sm text-slate-400">
                Website Health Score™ for Roe Realty — performance and platform checks.
              </p>
              <Link
                href="/apps/websites/health"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Health Centre →
              </Link>
            </div>
          ) : null}
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">Commerce</h2>
              <p className="mt-1 text-sm text-slate-400">
                Payments, quotes, invoices, and financial health.
              </p>
              <Link
                href="/apps/commerce"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open commerce →
              </Link>
            </div>
          ) : null}
            <div className="dg-card">
              <h2 className="font-semibold text-white">Automation</h2>
              <p className="mt-1 text-sm text-slate-400">
                Triggers and actions declared across apps — builder scaffold live.
              </p>
              <Link
                href="/apps/automation"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open automation →
              </Link>
            </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Apps</h2>
            <p className="mt-1 text-sm text-slate-400">
              Core, business, and growth apps for your organisation.
            </p>
            <Link
              href="/dashboard/apps"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Browse apps →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Support</h2>
            <p className="mt-1 text-sm text-slate-400">
              Questions during setup? Reach the DigitalGate team.
            </p>
            <SupportActions />
          </div>
        </div>

        <div className="mt-8">
          <PlatformRoadmapPanel />
        </div>

        <div className="dg-card mt-8">
          <h2 className="font-semibold text-white">Platform 1.0 setup</h2>
          <p className="mt-1 text-sm text-slate-400">
            Progress tracked in Postgres — no WordPress required for CRM.
          </p>
          {platformSession && setupStatus ? (
            <PlatformSetupChecklist
              status={setupStatus}
              organisationName={platformSession.organisationName}
            />
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Sign in with a configured database to view setup progress.
            </p>
          )}
          {!setupStatus?.hasContacts ? (
            <Link
              href="/apps/crm/contacts"
              className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add your first contact
            </Link>
          ) : null}
        </div>
      </main>
    </>
  );
}
