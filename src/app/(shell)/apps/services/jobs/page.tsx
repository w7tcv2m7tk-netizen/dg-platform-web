import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getActiveServiceTemplate,
  listContacts,
  listOrganisationMembers,
  listServiceJobs,
  sessionHasFeature,
} from "@dg/platform-core";

import { CreateServiceJobForm } from "@/components/services/CreateServiceJobForm";
import { JobsListFilters } from "@/components/services/JobsListFilters";
import { UpdateJobStageForm } from "@/components/services/UpdateJobStageForm";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import {
  formatDateTime,
  SERVICES_DEFAULT_TZ,
  zonedDayBoundsIso,
} from "@/lib/services-dates";

function memberLabel(m: { displayName: string | null; email: string | null; clerkUserId: string }) {
  return m.displayName?.trim() || m.email || m.clerkUserId.slice(0, 8);
}

interface PageProps {
  searchParams: Promise<{ q?: string; stage?: string; assignee?: string; status?: string; from?: string; to?: string }>;
}

export default async function ServicesJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthorisedPlatformPageSession("services.jobs.read");
  if (!session) notFound();

  const canWriteJobs = sessionHasFeature(session, "services.jobs.write");
  const canReadContacts = sessionHasFeature(session, "crm.contacts.read");

  const filters = {
    q: params.q?.trim() ?? "",
    stage: params.stage?.trim() ?? "",
    assignee: params.assignee?.trim() ?? "",
    status: params.status?.trim() ?? "",
    from: params.from?.trim() ?? "",
    to: params.to?.trim() ?? "",
  };

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true, timezone: true },
  });
  const timeZone = org?.timezone || SERVICES_DEFAULT_TZ;
  const template = getActiveServiceTemplate(org?.settings);
  const scheduledFrom = filters.from ? zonedDayBoundsIso(filters.from, timeZone).from : undefined;
  const scheduledTo = filters.to ? zonedDayBoundsIso(filters.to, timeZone).to : undefined;

  const [{ items, meta }, contacts, members] = await Promise.all([
    listServiceJobs({
      organisationId: session.organisationId,
      limit: 50,
      q: filters.q || undefined,
      stage: filters.stage || undefined,
      status: filters.status || undefined,
      assignedUserId: filters.assignee && filters.assignee !== "unassigned" ? filters.assignee : undefined,
      unassigned: filters.assignee === "unassigned",
      scheduledFrom,
      scheduledTo,
      sort: scheduledFrom || scheduledTo ? "scheduled" : "updated",
    }),
    canWriteJobs && canReadContacts ? listContacts({ organisationId: session.organisationId, limit: 100 }) : Promise.resolve({ items: [] }),
    canWriteJobs ? listOrganisationMembers(session.organisationId) : Promise.resolve([]),
  ]);

  const assigneeByClerkId = new Map(members.map((m) => [m.clerkUserId, memberLabel(m)] as const));
  const memberOptions = members.map((m) => ({ clerkUserId: m.clerkUserId, label: memberLabel(m) }));
  const stageLabel = new Map(template.workflow.map((s) => [s.id, s.label]));
  const hasFilters = Boolean(filters.q) || Boolean(filters.stage) || Boolean(filters.assignee) || Boolean(filters.status) || Boolean(filters.from) || Boolean(filters.to);

  return (
    <main className="dg-page-main space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-slate-400">{meta.total} result{meta.total === 1 ? "" : "s"} · {template.label} workflow</p>
        {canWriteJobs ? (
          <CreateServiceJobForm
            jobTypes={template.jobTypes}
            stages={template.workflow}
            contacts={contacts.items.map((c) => ({ id: c.id, label: [c.firstName, c.lastName].filter(Boolean).join(" ") }))}
            jobFields={template.jobFields}
            members={memberOptions}
            templateKey={template.key}
            jobLabel={template.terminology.job}
          />
        ) : null}
      </div>
      <JobsListFilters filters={filters} stages={template.workflow} members={memberOptions} />
      <div className="dg-card">
        {!items.length ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{hasFilters ? "No jobs match these filters." : `No jobs yet. Create one to start the ${template.workflow.map((s) => s.label).slice(0, 4).join(" → ")}… flow.`}</p>
            {hasFilters ? <Link href="/apps/services/jobs" className="text-sm text-sky-400 hover:underline">Clear filters</Link> : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/apps/services/jobs/${job.id}`} className="font-medium text-white hover:underline">{job.title}</Link>
                  <p className="text-sm text-slate-400">
                    {stageLabel.get(job.stage) ?? job.stage.replace(/_/g, " ")} · {job.jobType?.replace(/_/g, " ") ?? "—"}
                    {job.siteAddress ? ` · ${job.siteAddress}` : ""}
                    {job.scheduledStartAt ? ` · ${formatDateTime(job.scheduledStartAt, timeZone)}` : ""}
                    {job.assignedUserId ? ` · ${assigneeByClerkId.get(job.assignedUserId) ?? "Assigned"}` : " · Unassigned"}
                  </p>
                </div>
                {canWriteJobs ? <UpdateJobStageForm jobId={job.id} currentStage={job.stage} stages={template.workflow} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
