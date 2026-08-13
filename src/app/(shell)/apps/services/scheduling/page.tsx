import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  listOrganisationMembers,
  listServiceJobs,
} from "@dg/platform-core";

import { ServicesNav } from "@/components/services/ServicesNav";
import { ScheduleJobQuickForm } from "@/components/services/ScheduleJobQuickForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  dayKeyRange,
  formatDayHeading,
  formatTimeRange,
  SERVICES_DEFAULT_TZ,
  todayKey,
  zonedDayKey,
} from "@/lib/services-dates";

function memberLabel(m: {
  displayName: string | null;
  email: string | null;
  clerkUserId: string;
}) {
  return m.displayName?.trim() || m.email || m.clerkUserId.slice(0, 8);
}

export default async function ServicesSchedulingPage() {
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
          <h1 className="text-2xl font-bold text-white">Scheduling</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const { prisma } = await import("@dg/database");
  const [org, members] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { settings: true, timezone: true },
    }),
    listOrganisationMembers(session.organisationId),
  ]);
  const timeZone = org?.timezone || SERVICES_DEFAULT_TZ;
  const template = getActiveServiceTemplate(org?.settings);

  const startKey = todayKey(timeZone);
  const dayKeys = dayKeyRange(startKey, 14);

  // Wide ISO window; jobs are bucketed by org timezone day keys.
  const rangeStart = new Date();
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date();
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 16);

  const [{ items: scheduledWindow }, { items: needsSchedule }] = await Promise.all([
    listServiceJobs({
      organisationId: session.organisationId,
      status: "open",
      scheduledFrom: rangeStart.toISOString(),
      scheduledTo: rangeEnd.toISOString(),
      sort: "scheduled",
      limit: 100,
    }),
    listServiceJobs({
      organisationId: session.organisationId,
      status: "open",
      sort: "updated",
      limit: 50,
    }),
  ]);

  const scheduled = scheduledWindow.filter((j) => j.scheduledStartAt);
  const unassignedScheduled = scheduled.filter((j) => !j.assignedUserId);
  const unscheduledOpen = needsSchedule.filter((j) => !j.scheduledStartAt);

  const assigneeByClerkId = new Map(
    members.map((m) => [m.clerkUserId, memberLabel(m)] as const),
  );

  const byDay = new Map<string, typeof scheduled>();
  for (const key of dayKeys) byDay.set(key, []);
  for (const job of scheduled) {
    const key = zonedDayKey(job.scheduledStartAt!, timeZone);
    if (!byDay.has(key)) continue;
    byDay.get(key)!.push(job);
  }

  const stageLabel = new Map(template.workflow.map((s) => [s.id, s.label]));
  const jobWord = template.terminology.job.toLowerCase();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Scheduling</h1>
        <p className="mt-1 text-sm text-slate-400">
          Next 14 days · {timeZone.replace(/_/g, " ")} · day board for {jobWord}s
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Drag-and-drop calendar is not in closed beta — edit start/end on each {jobWord}.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="scheduling" />

        {unscheduledOpen.length > 0 ? (
          <section className="dg-card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
              Needs scheduling ({unscheduledOpen.length})
            </h2>
            <ul className="divide-y divide-slate-800">
              {unscheduledOpen.slice(0, 12).map((job) => (
                <li key={job.id} className="py-3">
                  <Link
                    href={`/apps/services/jobs/${job.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-sm text-slate-400">
                      {stageLabel.get(job.stage) ?? job.stage.replace(/_/g, " ")}
                      {job.siteAddress ? ` · ${job.siteAddress}` : ""}
                      {job.assignedUserId
                        ? ` · ${assigneeByClerkId.get(job.assignedUserId) ?? "Assigned"}`
                        : " · Unassigned"}
                    </p>
                  </Link>
                  <ScheduleJobQuickForm
                    jobId={job.id}
                    defaultDay={startKey}
                    members={members.map((m) => ({
                      clerkUserId: m.clerkUserId,
                      label: memberLabel(m),
                    }))}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {unassignedScheduled.length > 0 ? (
          <section className="dg-card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
              Scheduled · unassigned ({unassignedScheduled.length})
            </h2>
            <ul className="divide-y divide-slate-800">
              {unassignedScheduled.map((job) => (
                <li key={job.id} className="py-3">
                  <Link
                    href={`/apps/services/jobs/${job.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="text-xs text-amber-200/90">
                      {formatTimeRange(job.scheduledStartAt!, job.scheduledEndAt, timeZone)}
                      {" · "}
                      {zonedDayKey(job.scheduledStartAt!, timeZone)}
                    </p>
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-sm text-slate-400">
                      {job.siteAddress ?? "No address"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="space-y-4">
          {dayKeys.map((key) => {
            const jobs = byDay.get(key) ?? [];
            return (
              <section key={key} className="dg-card space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300/90">
                  {formatDayHeading(key, timeZone)}
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    {jobs.length
                      ? `${jobs.length} ${jobWord}${jobs.length === 1 ? "" : "s"}`
                      : "Free"}
                  </span>
                </h2>
                {!jobs.length ? (
                  <p className="text-sm text-slate-500">No jobs scheduled.</p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {jobs.map((job) => (
                      <li key={job.id} className="py-3">
                        <Link
                          href={`/apps/services/jobs/${job.id}`}
                          className="block hover:opacity-90"
                        >
                          <p className="text-xs text-amber-200/90">
                            {formatTimeRange(
                              job.scheduledStartAt!,
                              job.scheduledEndAt,
                              timeZone,
                            )}
                          </p>
                          <p className="font-medium text-white">{job.title}</p>
                          <p className="text-sm text-slate-400">
                            {job.siteAddress ?? "No address"}
                            {" · "}
                            {stageLabel.get(job.stage) ?? job.stage.replace(/_/g, " ")}
                            {job.assignedUserId
                              ? ` · ${assigneeByClerkId.get(job.assignedUserId) ?? "Assigned"}`
                              : " · Unassigned"}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
