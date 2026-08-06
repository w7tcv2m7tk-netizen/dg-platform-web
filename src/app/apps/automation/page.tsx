import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getAppSetupHref, resolvePlatformSession } from "@dg/platform-core";

import { AutomationBuilderPanel } from "@/components/automation/AutomationBuilderPanel";
import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";
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
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  return (
    <>
      <PlatformRoadmapBar />
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
          {session?.organisationName ?? "DigitalGate"} · triggers & actions registry
        </p>
      </header>
      <main className="dg-page-main">
        <AutomationBuilderPanel />
      </main>
    </>
  );
}
