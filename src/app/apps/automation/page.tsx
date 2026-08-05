import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";

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
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Automation</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · triggers & actions registry
        </p>
      </header>
      <main className="flex-1 p-8">
        <AutomationBuilderPanel />
      </main>
    </>
  );
}
