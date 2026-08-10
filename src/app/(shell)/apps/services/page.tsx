import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getServicesOverview,
  listServiceTemplates,
} from "@dg/platform-core";

import { ApplyServiceTemplateForm } from "@/components/services/ApplyServiceTemplateForm";
import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function ServicesOverviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Services</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in with DATABASE_URL configured.</p>
        </main>
      </>
    );
  }

  const [overview, templates] = await Promise.all([
    getServicesOverview(session.organisationId),
    Promise.resolve(listServiceTemplates()),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session.organisationName} · {overview.templateLabel} template
          {overview.templateKey ? ` (${overview.templateKey})` : " — pick a template to specialise"}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="overview" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Open jobs</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.openJobs}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Scheduled (7d)</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {overview.counts.scheduledThisWeek}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.completed}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Quotes</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.quotes}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">{overview.honestyNote}</p>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Pipeline</h2>
            {!overview.stageBreakdown.length ? (
              <p className="text-sm text-slate-500">No open jobs yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overview.stageBreakdown.map((s) => (
                  <li key={s.stage} className="flex justify-between text-slate-300">
                    <span>{s.label}</span>
                    <span className="tabular-nums text-white">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/apps/services/jobs" className="inline-block text-sm text-sky-400 hover:underline">
              View all jobs →
            </Link>
          </section>

          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Service template</h2>
            <p className="text-sm text-slate-400">
              One Services App — industry is configuration. Applying a template sets workflow, job
              types, and profile services.
            </p>
            <ApplyServiceTemplateForm
              templates={templates.map((t) => ({
                key: t.key,
                label: t.label,
                description: t.description,
              }))}
            />
          </section>
        </div>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Recent jobs</h2>
          {!overview.recentJobs.length ? (
            <p className="mt-3 text-sm text-slate-500">
              No jobs yet.{" "}
              <Link href="/apps/services/jobs" className="text-sky-400 hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800">
              {overview.recentJobs.map((job) => (
                <li key={job.id} className="py-3">
                  <Link
                    href={`/apps/services/jobs/${job.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-sm text-slate-400">
                      {job.stage.replace(/_/g, " ")} · {job.status}
                      {job.jobType ? ` · ${job.jobType.replace(/_/g, " ")}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
