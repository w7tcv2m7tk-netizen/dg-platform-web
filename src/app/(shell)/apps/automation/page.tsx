import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getAppSetupHref } from "@dg/platform-core";

import { AutomationBuilderPanel } from "@/components/automation/AutomationBuilderPanel";
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
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Automation</h1>
          <Link
            href={getAppSetupHref("automation")}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15"
          >
            Setup guide
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · triggers & actions registry — closed beta
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-slate-400">
          <p className="font-medium text-emerald-200">Platform automations (on)</p>
          <p className="mt-1">
            Founding-path defaults run in-process: vendor enquiry → contact →
            opportunity → follow-up task → ack email → notify; opportunity
            follow-up when opened without a lead; payment completed → notify.
            Visual builder and durable org-rule CRUD remain next — not required
            for Gate 1 dogfood.
          </p>
        </div>
        <AutomationBuilderPanel />
      </main>
    </>
  );
}
