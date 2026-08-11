import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  canAccessCommandCentre,
  getServicesOverview,
  listServiceTemplates,
} from "@dg/platform-core";

import { ApplyServiceTemplateForm } from "@/components/services/ApplyServiceTemplateForm";
import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { formatDateTime, SERVICES_DEFAULT_TZ } from "@/lib/services-dates";

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

  const { prisma } = await import("@dg/database");
  const [overview, org] = await Promise.all([
    getServicesOverview(session.organisationId),
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { timezone: true },
    }),
  ]);
  const templates = listServiceTemplates();
  const timeZone = org?.timezone || SERVICES_DEFAULT_TZ;
  const jobWord = overview.terminology.job.toLowerCase();
  const showStaffLaunchLink = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session.organisationName} · {overview.templateLabel} template
          {overview.templateKey
            ? ` (${overview.templateKey})`
            : " — pick a template to specialise"}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="overview" />

        {showStaffLaunchLink ? (
          <p className="text-xs text-slate-500">
            Staff:{" "}
            <Link
              href="/command/docs/services-beta-launch"
              className="text-sky-400 hover:underline"
            >
              Services beta launch checklist
            </Link>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/apps/services/jobs?status=open"
            className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Open jobs</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.openJobs}</p>
          </Link>
          <Link
            href="/apps/services/scheduling"
            className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Scheduled (7d)</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {overview.counts.scheduledThisWeek}
            </p>
          </Link>
          <Link
            href="/apps/services/jobs?assignee=unassigned&status=open"
            className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Unassigned</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {overview.counts.unassignedOpen}
            </p>
          </Link>
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.completed}</p>
          </div>
          <Link
            href="/apps/commerce/quotes"
            className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Quotes</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.quotes}</p>
          </Link>
        </div>

        <p className="text-xs text-slate-500">{overview.honestyNote}</p>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Uses platform Core</h2>
          <p className="mt-1 text-xs text-slate-500">
            Not separate Services modules — same objects as the rest of DigitalGate.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li>
              <Link href="/apps/commerce/quotes" className="text-sky-400 hover:underline">
                Quotes → Commerce
              </Link>
            </li>
            <li>
              <Link href="/apps/crm/contacts" className="text-sky-400 hover:underline">
                Customers → CRM
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings/team" className="text-sky-400 hover:underline">
                Team → Settings
              </Link>
            </li>
          </ul>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Up next</h2>
            {!overview.nextJobs.length ? (
              <p className="text-sm text-slate-500">
                Nothing scheduled in the next 14 days.{" "}
                <Link href="/apps/services/jobs" className="text-sky-400 hover:underline">
                  Set a start time on a {jobWord}
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {overview.nextJobs.map((job) => (
                  <li key={job.id} className="py-3">
                    <Link
                      href={`/apps/services/jobs/${job.id}`}
                      className="block hover:opacity-90"
                    >
                      <p className="text-xs text-amber-200/90">
                        {job.scheduledStartAt
                          ? formatDateTime(job.scheduledStartAt, timeZone)
                          : "—"}
                      </p>
                      <p className="font-medium text-white">{job.title}</p>
                      <p className="text-sm text-slate-400">
                        {job.siteAddress ?? "No address"}
                        {job.assignedUserId ? "" : " · Unassigned"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/apps/services/scheduling"
              className="inline-block text-sm text-sky-400 hover:underline"
            >
              Open scheduling →
            </Link>
          </section>

          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Pipeline</h2>
            {!overview.stageBreakdown.length ? (
              <p className="text-sm text-slate-500">No open jobs yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overview.stageBreakdown.map((s) => (
                  <li key={s.stage} className="flex justify-between text-slate-300">
                    <Link
                      href={`/apps/services/jobs?stage=${encodeURIComponent(s.stage)}&status=open`}
                      className="hover:text-white hover:underline"
                    >
                      {s.label}
                    </Link>
                    <span className="tabular-nums text-white">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/apps/services/jobs" className="inline-block text-sm text-sky-400 hover:underline">
              View all jobs →
            </Link>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="dg-card space-y-3">
            <h2 className="font-semibold text-white">Service template</h2>
            <p className="text-sm text-slate-400">
              One Services App — industry is configuration. Applying a template sets workflow, job
              types, and profile services.
            </p>
            <ApplyServiceTemplateForm
              currentKey={overview.templateKey}
              templates={templates.map((t) => ({
                key: t.key,
                label: t.label,
                description: t.description,
              }))}
            />
          </section>

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
        </div>
      </main>
    </>
  );
}
