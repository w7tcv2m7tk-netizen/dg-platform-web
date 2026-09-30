import { GrowthAppHeader } from "@/components/growth/GrowthAppHeader";
import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getAppSetupHref } from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";

export default async function AutomationPage() {
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

  return (
    <>
      <GrowthAppHeader appId="automation" description="Build and monitor repeatable workflows that move work and follow-up forward." />
      <main className="dg-page-main space-y-4">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Automation is active</h2>
          <p className="mt-1 text-sm text-slate-400">
            DigitalGate runs connected workflows automatically when supported business events occur.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="font-medium text-white">Lead follow-up</p>
              <p className="mt-1 text-sm text-slate-400">
                New enquiries can create the connected CRM records, follow-up task and acknowledgement.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="font-medium text-white">Opportunity follow-up</p>
              <p className="mt-1 text-sm text-slate-400">
                Open opportunities can trigger follow-up activity when no lead is attached.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="font-medium text-white">Payment notifications</p>
              <p className="mt-1 text-sm text-slate-400">
                Completed payment events can notify the relevant team workflow.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link href="/apps/automation/rules" className="dg-card hover:border-slate-700">
            <h2 className="font-semibold text-white">Active rules</h2>
            <p className="mt-1 text-sm text-slate-400">
              View the automation workflows currently active in DigitalGate.
            </p>
          </Link>
          <Link href="/apps/automation/logs" className="dg-card hover:border-slate-700">
            <h2 className="font-semibold text-white">Run history</h2>
            <p className="mt-1 text-sm text-slate-400">
              Review recent automation activity recorded for your organisation.
            </p>
          </Link>
        </section>
      </main>
    </>
  );
}
