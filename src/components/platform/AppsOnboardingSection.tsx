import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getPlatformSetupStatus,} from "@dg/platform-core";

import { PlatformSetupChecklist } from "@/components/PlatformSetupChecklist";
import { fetchPortalMe } from "@/lib/dg-api";

export async function AppsOnboardingSection() {
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

  const setupStatus = session
    ? await getPlatformSetupStatus(session.organisationId)
    : null;

  const setupSteps = setupStatus
    ? [
        setupStatus.orgProvisioned,
        setupStatus.hasTeamMember,
        setupStatus.hasContacts,
        setupStatus.hasTimelineActivity,
      ]
    : [];
  const setupPercent = setupSteps.length
    ? Math.round((setupSteps.filter(Boolean).length / setupSteps.length) * 100)
    : 0;
  const setupComplete = setupPercent === 100;

  return (
    <section id="onboarding" className="dg-card scroll-mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Platform setup</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Self-serve checklist for your organisation — CRM, connectors, and first app workflows.
            Everything runs on{" "}
            <span className="text-slate-300">app.digitalgate.com.au</span>.
          </p>
        </div>
        {session && setupStatus && !setupComplete ? (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
            {setupPercent}% complete
          </span>
        ) : session && setupStatus && setupComplete ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
            Setup complete
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          {session && setupStatus ? (
            <PlatformSetupChecklist
              status={setupStatus}
              organisationName={session.organisationName}
            />
          ) : (
            <p className="text-sm text-slate-400">Sign in to track your setup progress.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/apps/crm/contacts"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add first contact
            </Link>
            <Link
              href="/apps/re/vendor-leads"
              className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Sync vendor leads
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="font-medium text-white">Recommended order</h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li>1. Apply your plan above — sidebar updates instantly</li>
            <li>2. Turn on the apps you need with On/Off toggles</li>
            <li>3. Follow each app&apos;s setup guide (CRM, Real Estate, Commerce…)</li>
            <li>4. Add contacts and sync WordPress leads</li>
            <li>5. Run your first appraisal or booking workflow</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
