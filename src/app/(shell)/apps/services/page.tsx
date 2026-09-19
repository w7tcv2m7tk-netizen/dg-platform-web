import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessCommandCentre, getServicesOverview, sessionHasFeature } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function servicesHref(
  path: string,
  templateKey: string | null,
  params: Record<string, string> = {},
): string {
  const query = new URLSearchParams();
  if (templateKey) query.set("template", templateKey);
  for (const [key, value] of Object.entries(params)) query.set(key, value);
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
import { canConfigureServices, canManageServices } from "@/lib/services-page-access";
import { formatDateTime, SERVICES_DEFAULT_TZ } from "@/lib/services-dates";
import { getServicesWorkspaceProfile } from "@/lib/services-workspace-profiles";

export default async function ServicesOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await getAuthorisedPlatformPageSession("services.jobs.read");
  if (!session) notFound();

  const { template: requestedTemplate } = await searchParams;
  const canWriteJobs = canManageServices(session);
  const canConfigure = canConfigureServices(session);
  const canReadCommerce = sessionHasFeature(session, "commerce.read");
  const { prisma } = await import("@dg/database");
  const [overview, org] = await Promise.all([
    getServicesOverview(session.organisationId, undefined, requestedTemplate),
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { timezone: true },
    }),
  ]);

  const timeZone = org?.timezone || SERVICES_DEFAULT_TZ;
  const jobWord = overview.terminology.job.toLowerCase();
  const profile = getServicesWorkspaceProfile(overview.templateKey);
  const showStaffLaunchLink = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });

  return (
    <main className="dg-page-main space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
            {session.organisationName}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">{profile.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">{profile.description}</p>
          {!canWriteJobs ? (
            <p className="mt-1 text-xs text-slate-500">
              Read-only access. Organisation-wide edit access is required to create, assign or update {jobWord}s.
            </p>
          ) : null}
        </div>
        {canConfigure ? (
          <Link
            href="/dashboard/apps/catalogue#industry-apps"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-sky-500 hover:text-white"
          >
            + Add service type
          </Link>
        ) : null}
      </div>

      {showStaffLaunchLink ? (
        <p className="text-xs text-slate-500">
          Staff:{" "}
          <Link href="/command/docs/services-beta-launch" className="inline-flex min-h-11 items-center text-sky-400 hover:underline">
            Services beta launch checklist
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href={servicesHref("/apps/services/jobs", overview.templateKey, { status: "open" })} className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500">
          <p className="text-xs uppercase tracking-wide text-slate-500">Open {jobWord}s</p>
          <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.openJobs}</p>
        </Link>
        <Link href={servicesHref("/apps/services/scheduling", overview.templateKey)} className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500">
          <p className="text-xs uppercase tracking-wide text-slate-500">Scheduled (7d)</p>
          <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.scheduledThisWeek}</p>
        </Link>
        <Link href={servicesHref("/apps/services/jobs", overview.templateKey, { assignee: "unassigned", status: "open" })} className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500">
          <p className="text-xs uppercase tracking-wide text-slate-500">Unassigned</p>
          <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.unassignedOpen}</p>
        </Link>
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.completed}</p>
        </div>
        {canReadCommerce ? (
          <Link href="/apps/commerce/quotes" className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4 hover:border-slate-500">
            <p className="text-xs uppercase tracking-wide text-slate-500">{overview.terminology.quote}s</p>
            <p className="mt-1 text-3xl font-semibold text-white">{overview.counts.quotes}</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Quotes</p>
            <p className="mt-1 text-lg font-semibold text-slate-500">Unavailable</p>
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-sky-900/60 bg-sky-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">{profile.eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{profile.capabilityHeading}</h2>
        <p className="mt-1 max-w-4xl text-sm text-slate-400">{profile.capabilityIntro}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profile.capabilities.map(([title, copy]) => (
            <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500">{overview.honestyNote}</p>

      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Connected platform records</h2>
        <p className="mt-1 text-xs text-slate-500">
          Customers, team, quotes, billing and reporting remain shared DigitalGate records — no duplicate silos.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {canReadCommerce ? <li><Link href="/apps/commerce/quotes" className="inline-flex min-h-11 items-center text-sky-400 hover:underline">{overview.terminology.quote}s → Commerce</Link></li> : null}
          <li><Link href="/apps/crm/contacts" className="inline-flex min-h-11 items-center text-sky-400 hover:underline">{overview.terminology.customer}s → CRM</Link></li>
          <li><Link href="/dashboard/business/team" className="inline-flex min-h-11 items-center text-sky-400 hover:underline">Team → Business</Link></li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">Upcoming {jobWord}s</h2>
          {!overview.nextJobs.length ? (
            <p className="text-sm text-slate-500">
              Nothing scheduled in the next 14 days.
              {canWriteJobs ? <> <Link href={servicesHref("/apps/services/jobs", overview.templateKey)} className="inline-flex min-h-11 items-center text-sky-400 hover:underline">Set a start time on a {jobWord}</Link>.</> : null}
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {overview.nextJobs.map((job) => (
                <li key={job.id} className="py-3">
                  <Link href={`/apps/services/jobs/${job.id}`} className="block min-h-11 py-1 hover:opacity-90">
                    <p className="text-xs text-amber-200/90">{job.scheduledStartAt ? formatDateTime(job.scheduledStartAt, timeZone) : "—"}</p>
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-sm text-slate-400">{job.siteAddress ?? "No address"}{job.assignedUserId ? "" : " · Unassigned"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/apps/services/scheduling" className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline">Open scheduling →</Link>
        </section>

        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">{profile.title} pipeline</h2>
          {!overview.stageBreakdown.length ? (
            <p className="text-sm text-slate-500">No open {jobWord}s yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {overview.stageBreakdown.map((s) => (
                <li key={s.stage} className="flex min-h-11 items-center justify-between text-slate-300">
                  <Link href={servicesHref("/apps/services/jobs", overview.templateKey, { stage: s.stage, status: "open" })} className="inline-flex min-h-11 items-center hover:text-white hover:underline">{s.label}</Link>
                  <span className="tabular-nums text-white">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={servicesHref("/apps/services/jobs", overview.templateKey)} className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline">View all {jobWord}s →</Link>
        </section>
      </div>

      <section className="dg-card">
        <h2 className="font-semibold text-white">Recent {jobWord}s</h2>
        {!overview.recentJobs.length ? (
          <p className="mt-3 text-sm text-slate-500">No {jobWord}s yet.{canWriteJobs ? <> <Link href={servicesHref("/apps/services/jobs", overview.templateKey)} className="inline-flex min-h-11 items-center text-sky-400 hover:underline">Create one</Link></> : null}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800">
            {overview.recentJobs.map((job) => (
              <li key={job.id} className="py-3">
                <Link href={`/apps/services/jobs/${job.id}`} className="block min-h-11 py-1 hover:opacity-90">
                  <p className="font-medium text-white">{job.title}</p>
                  <p className="text-sm text-slate-400">{job.stage.replace(/_/g, " ")} · {job.status}{job.jobType ? ` · ${job.jobType.replace(/_/g, " ")}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
