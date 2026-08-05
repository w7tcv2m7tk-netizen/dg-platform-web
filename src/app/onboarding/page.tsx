import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getPlatformSetupStatus, resolvePlatformSession } from "@dg/platform-core";

import { PlatformSetupChecklist } from "@/components/PlatformSetupChecklist";

export default async function OnboardingPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolvePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  const setupStatus = session
    ? await getPlatformSetupStatus(session.organisationId)
    : null;

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Onboarding</h1>
        <p className="text-sm text-slate-400">
          Complete setup inside your DigitalGate platform — no external tabs
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Platform setup</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your organisation, CRM, and apps live here on{" "}
              <span className="text-slate-300">app.digitalgate.com.au</span>.
            </p>
            {session && setupStatus ? (
              <PlatformSetupChecklist
                status={setupStatus}
                organisationName={session.organisationName}
              />
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Sign in to track your setup progress.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/apps/crm/contacts"
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Add first contact
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:border-slate-500"
              >
                Plan & apps
              </Link>
            </div>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">What&apos;s next</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>1. Create your account and sign in</li>
              <li>2. Choose your plan and industry apps</li>
              <li>3. Add contacts in CRM — data stays in Postgres</li>
              <li>4. Open Real Estate → sync vendor leads from Roe</li>
              <li>5. Start an appraisal → property record</li>
            </ul>
            <Link
              href="/dashboard"
              className="mt-6 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Back to dashboard →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
