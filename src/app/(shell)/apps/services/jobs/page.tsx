import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  listContacts,
  listOrganisationMembers,
  listServiceJobs,
} from "@dg/platform-core";

import { CreateServiceJobForm } from "@/components/services/CreateServiceJobForm";
import { ServicesNav } from "@/components/services/ServicesNav";
import { UpdateJobStageForm } from "@/components/services/UpdateJobStageForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

function memberLabel(m: {
  displayName: string | null;
  email: string | null;
  clerkUserId: string;
}) {
  return m.displayName?.trim() || m.email || m.clerkUserId.slice(0, 8);
}

export default async function ServicesJobsPage() {
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
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });
  const template = getActiveServiceTemplate(org?.settings);
  const [{ items, meta }, contacts, members] = await Promise.all([
    listServiceJobs({ organisationId: session.organisationId, limit: 50 }),
    listContacts({ organisationId: session.organisationId, limit: 100 }),
    listOrganisationMembers(session.organisationId),
  ]);

  const assigneeByClerkId = new Map(
    members.map((m) => [m.clerkUserId, memberLabel(m)] as const),
  );
  const memberOptions = members.map((m) => ({
    clerkUserId: m.clerkUserId,
    label: memberLabel(m),
  }));

  return (
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{template.terminology.job}s</h1>
            <p className="mt-1 text-sm text-slate-400">
              {meta.total} · {template.label} workflow
            </p>
          </div>
          <CreateServiceJobForm
            jobTypes={template.jobTypes}
            stages={template.workflow}
            contacts={contacts.items.map((c) => ({
              id: c.id,
              label: [c.firstName, c.lastName].filter(Boolean).join(" "),
            }))}
            jobFields={template.jobFields}
            members={memberOptions}
            templateKey={template.key}
            jobLabel={template.terminology.job}
          />
        </div>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="jobs" />
        <div className="dg-card">
          {!items.length ? (
            <p className="text-sm text-slate-500">
              No jobs yet. Create one to start the{" "}
              {template.workflow.map((s) => s.label).slice(0, 4).join(" → ")}… flow.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {items.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/apps/services/jobs/${job.id}`}
                      className="font-medium text-white hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="text-sm text-slate-400">
                      {job.jobType?.replace(/_/g, " ") ?? "—"}
                      {job.siteAddress ? ` · ${job.siteAddress}` : ""}
                      {job.scheduledStartAt
                        ? ` · ${new Date(job.scheduledStartAt).toLocaleString("en-AU")}`
                        : ""}
                      {job.assignedUserId
                        ? ` · ${assigneeByClerkId.get(job.assignedUserId) ?? "Assigned"}`
                        : ""}
                    </p>
                  </div>
                  <UpdateJobStageForm
                    jobId={job.id}
                    currentStage={job.stage}
                    stages={template.workflow}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
