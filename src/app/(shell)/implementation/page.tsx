import Link from "next/link";
import {
  getFoundingImplementation,
  getFoundingOnboarding,
  listTasks,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

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

  const [plan, onboarding, tasks] = await Promise.all([
    getFoundingImplementation(session.organisationId),
    getFoundingOnboarding(session.organisationId),
    listTasks({ organisationId: session.organisationId, limit: 50 }),
  ]);
  const foundingTasks = tasks.items.filter(
    (task) => task.sourceApp === "founding" || task.metadata?.founding === true,
  );

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          Founding Customer
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Your DigitalGate Setup Plan</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          We&apos;ve received your onboarding information and created your initial
          implementation plan. This is configuration — not another questionnaire.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!plan ? (
          <div className="dg-card">
            <p className="text-slate-400">
              No implementation plan yet.{" "}
              <Link href="/onboarding?journey=founding" className="text-sky-400 hover:underline">
                Complete onboarding
              </Link>{" "}
              first.
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Business Profile", Boolean(onboarding?.answers.legalName)],
                ["Team", (onboarding?.answers.team?.length ?? 0) > 0],
                ["Current Systems", Boolean(onboarding?.answers.crmSystem || onboarding?.answers.websitePlatform)],
                ["Goals", (plan.goals.length ?? 0) > 0],
                ["App Selection", plan.apps.length > 0],
                ["Integration review", plan.connectors.length > 0],
                ["Configuration", plan.status === "configuration" || plan.status === "in_progress"],
                ["Go-live", plan.status === "live" || plan.status === "go_live_pending"],
              ].map(([label, done]) => (
                <div key={String(label)} className="dg-card">
                  <p className="text-sm text-white">{label}</p>
                  <p className={done ? "text-emerald-300" : "text-amber-300"}>
                    {done ? "Complete / in progress" : "Pending"}
                  </p>
                </div>
              ))}
            </section>

            <section className="dg-card space-y-2">
              <h2 className="font-semibold text-white">Recommended starting platform</h2>
              <p className="text-sm text-slate-300">
                Core: {plan.recommendedCore.join(" · ") || "CRM · Contacts · Opportunities · Tasks"}
              </p>
              <p className="text-sm text-slate-300">
                Growth: {plan.recommendedGrowth.join(" · ") || "—"}
              </p>
              <p className="text-sm text-slate-300">
                Industry: {plan.recommendedIndustry.join(" · ") || "—"}
              </p>
            </section>

            <section className="dg-card">
              <h2 className="font-semibold text-white">Your first three priorities</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">
                {plan.priorities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>

            <section className="dg-card">
              <h2 className="font-semibold text-white">Implementation tasks</h2>
              <ul className="mt-3 divide-y divide-slate-800">
                {foundingTasks.length === 0 ? (
                  <li className="py-2 text-sm text-slate-500">Tasks will appear after submit.</li>
                ) : (
                  foundingTasks.map((task) => (
                    <li key={task.id} className="flex justify-between gap-3 py-2 text-sm">
                      <span className="text-white">{task.title}</span>
                      <span className="text-slate-500">{task.status}</span>
                    </li>
                  ))
                )}
              </ul>
              <Link href="/apps/crm/tasks" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
                Open tasks →
              </Link>
            </section>
          </>
        )}
      </main>
    </>
  );
}
