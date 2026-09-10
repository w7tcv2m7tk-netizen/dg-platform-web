import Link from "next/link";
import {
  GEN2_PLATFORM_PLANS,
  getFoundingImplementation,
  getGen2OnboardingProgress,
  getOrganisationGoals,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

function statusLabel(done: boolean) {
  return done ? "Complete" : "Pending";
}

export default async function ImplementationPage() {
  const { session } = await getPlatformPageContext();
  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Implementation</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in to view your DigitalGate setup plan.</p>
        </main>
      </>
    );
  }

  const [progress, goals] = await Promise.all([
    getGen2OnboardingProgress(session.organisationId),
    getOrganisationGoals(session.organisationId).catch(() => []),
  ]);
  const foundingPlan = progress.founding
    ? await getFoundingImplementation(session.organisationId).catch(() => null)
    : null;

  const completed = new Set(progress.completedSteps);
  const selectedPlan = GEN2_PLATFORM_PLANS.find((plan) => plan.id === progress.platformTier);
  const selectedApps = [...(progress.industryApps ?? []), ...(progress.premiumApps ?? [])];
  const onboardingStarted = progress.completedSteps.length > 0 || progress.currentStep !== "welcome";
  const onboardingComplete = Boolean(progress.completedAt) || completed.has("implementation");
  const subscriptionActive = Boolean(progress.subscriptionActivatedAt) || completed.has("stripe");

  const setupStatus = [
    ["Business identity", completed.has("business_identity")],
    ["Business Brain", completed.has("business_profile")],
    ["Goals & priorities", completed.has("goals") || goals.length > 0],
    ["Platform plan", completed.has("plan") && Boolean(progress.platformTier)],
    ["Apps", completed.has("apps")],
    ["Subscription", subscriptionActive],
    ["Connections", completed.has("connect")],
    ["Implementation", onboardingComplete],
  ] as const;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          {progress.founding ? "Founding Customer · DigitalGate Gen 2" : "DigitalGate Gen 2"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Your DigitalGate Setup</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Your onboarding now hands directly into the live DigitalGate platform. Review what is
          ready, finish any optional connections, then start working from your Business Overview.
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        {!onboardingStarted ? (
          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Complete onboarding first</h2>
            <p className="text-sm text-slate-400">
              We need your business identity, Business Brain foundation, goals and platform choices
              before we can prepare your implementation hand-off.
            </p>
            <Link
              href={progress.founding ? "/onboarding?journey=founding" : "/onboarding"}
              className="inline-block text-sm font-medium text-sky-400 hover:underline"
            >
              Continue onboarding →
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {setupStatus.map(([label, done]) => (
                <div key={label} className="dg-card">
                  <p className="text-sm text-white">{label}</p>
                  <p className={done ? "text-emerald-300" : "text-amber-300"}>
                    {statusLabel(done)}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="dg-card space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Platform
                  </p>
                  <h2 className="mt-1 font-semibold text-white">
                    {selectedPlan?.name ?? "Platform plan"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedPlan?.blurb ?? "Your selected DigitalGate platform foundation."}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Billing
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {progress.billingCadence === "annual" ? "Annual" : "Monthly"}
                    {subscriptionActive ? " · Subscription activated" : " · Activation pending"}
                  </p>
                </div>
              </div>

              <div className="dg-card space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Selected add-ons
                  </p>
                  <h2 className="mt-1 font-semibold text-white">Apps & industry tools</h2>
                </div>
                {selectedApps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedApps.map((app) => (
                      <span
                        key={app}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No paid add-on apps selected. Your included DigitalGate core apps are ready.
                  </p>
                )}
                <Link href="/apps" className="text-sm text-sky-400 hover:underline">
                  Open Apps →
                </Link>
              </div>
            </section>

            <section className="dg-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Your goals & priorities</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    These goals feed DigitalGate&apos;s Business Brain, Advisor and opportunity engines.
                  </p>
                </div>
                <Link href="/dashboard/business" className="text-sm text-sky-400 hover:underline">
                  Review Business Brain →
                </Link>
              </div>
              {goals.length > 0 ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {goals.slice(0, 8).map((goal) => (
                    <li key={goal.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
                      {goal.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-amber-300">
                  No active goals are available yet. Return to onboarding to add your priorities.
                </p>
              )}
            </section>

            {foundingPlan ? (
              <section className="dg-card space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">
                    Founding 10 implementation
                  </p>
                  <h2 className="mt-1 font-semibold text-white">Your guided implementation plan</h2>
                </div>
                {foundingPlan.analysis ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {foundingPlan.analysis}
                  </p>
                ) : null}
                {foundingPlan.priorities.length > 0 ? (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                    {foundingPlan.priorities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                <Link href="/apps/crm/tasks" className="text-sm text-sky-400 hover:underline">
                  Open implementation tasks →
                </Link>
              </section>
            ) : null}

            <section className="dg-card">
              <h2 className="font-semibold text-white">Start using DigitalGate</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                You do not need to complete every optional connection before getting value from the
                platform. Start with your Business Overview, then connect services and configure apps
                as they become relevant.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Open Business Overview
                </Link>
                <Link
                  href="/dashboard/settings/connections"
                  className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  Connect services
                </Link>
                {!onboardingComplete ? (
                  <Link
                    href={progress.founding ? "/onboarding?journey=founding" : "/onboarding"}
                    className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                  >
                    Finish onboarding
                  </Link>
                ) : null}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
