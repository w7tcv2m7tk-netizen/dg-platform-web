import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  listOrganisationMembers,
  listServiceJobs,
} from "@dg/platform-core";

import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

function dayKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDayHeading(key: string) {
  const [y, m, day] = key.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(startIso: string, endIso: string | null) {
  const start = new Date(startIso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

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

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);

  const { prisma } = await import("@dg/database");
  const [org, members] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { settings: true },
    }),
    listOrganisationMembers(session.organisationId),
  ]);
  const template = getActiveServiceTemplate(org?.settings);

  const { items } = await listServiceJobs({
    organisationId: session.organisationId,
    scheduledFrom: now.toISOString(),
    scheduledTo: horizon.toISOString(),
    limit: 100,
  });

  const scheduled = items.filter((j) => j.scheduledStartAt);
  const assigneeByClerkId = new Map(
    members.map((m) => [m.clerkUserId, memberLabel(m)] as const),
  );

  const byDay = new Map<string, typeof scheduled>();
  for (const job of scheduled) {
    const key = dayKey(job.scheduledStartAt!);
    const list = byDay.get(key) ?? [];
    list.push(job);
    byDay.set(key, list);
  }
  const dayKeys = [...byDay.keys()].sort();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Scheduling</h1>
        <p className="mt-1 text-sm text-slate-400">
          Next 14 days · day board for {template.terminology.job.toLowerCase()}s
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="scheduling" />
        {!dayKeys.length ? (
          <div className="dg-card">
            <p className="text-sm text-slate-500">
              Nothing scheduled. Set a start time on a{" "}
              {template.terminology.job.toLowerCase()} from{" "}
              <Link href="/apps/services/jobs" className="text-sky-400 hover:underline">
                Jobs
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dayKeys.map((key) => (
              <section key={key} className="dg-card space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300/90">
                  {formatDayHeading(key)}
                </h2>
                <ul className="divide-y divide-slate-800">
                  {(byDay.get(key) ?? []).map((job) => (
                    <li key={job.id} className="py-3">
                      <Link
                        href={`/apps/services/jobs/${job.id}`}
                        className="block hover:opacity-90"
                      >
                        <p className="text-xs text-amber-200/90">
                          {formatTimeRange(job.scheduledStartAt!, job.scheduledEndAt)}
                        </p>
                        <p className="font-medium text-white">{job.title}</p>
                        <p className="text-sm text-slate-400">
                          {job.siteAddress ?? "No address"}
                          {" · "}
                          {job.stage.replace(/_/g, " ")}
                          {job.assignedUserId
                            ? ` · ${assigneeByClerkId.get(job.assignedUserId) ?? "Assigned"}`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
