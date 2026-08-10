import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getActiveServiceTemplate, listServiceJobs } from "@dg/platform-core";

import { ServicesNav } from "@/components/services/ServicesNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

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
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });
  const template = getActiveServiceTemplate(org?.settings);

  const { items } = await listServiceJobs({
    organisationId: session.organisationId,
    scheduledFrom: now.toISOString(),
    scheduledTo: horizon.toISOString(),
    limit: 50,
  });

  const scheduled = items.filter((j) => j.scheduledStartAt);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Scheduling</h1>
        <p className="mt-1 text-sm text-slate-400">
          Next 14 days · {template.terminology.job.toLowerCase()} calendar (list MVP)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="scheduling" />
        <div className="dg-card">
          {!scheduled.length ? (
            <p className="text-sm text-slate-500">
              Nothing scheduled. Set a start time when creating a{" "}
              {template.terminology.job.toLowerCase()} on{" "}
              <Link href="/apps/services/jobs" className="text-sky-400 hover:underline">
                Jobs
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {scheduled.map((job) => (
                <li key={job.id} className="py-3">
                  <Link href={`/apps/services/jobs/${job.id}`} className="block hover:opacity-90">
                    <p className="text-xs text-amber-200/90">
                      {job.scheduledStartAt
                        ? new Date(job.scheduledStartAt).toLocaleString("en-AU")
                        : ""}
                    </p>
                    <p className="font-medium text-white">{job.title}</p>
                    <p className="text-sm text-slate-400">
                      {job.siteAddress ?? "No address"} · {job.stage.replace(/_/g, " ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
