import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  getContact,
  getServiceJob,
  listOrganisationActivities,
  listOrganisationMembers,
  listQuotesForEntity,
} from "@dg/platform-core";

import { AddServiceJobNoteForm } from "@/components/services/AddServiceJobNoteForm";
import { EditServiceJobForm } from "@/components/services/EditServiceJobForm";
import { JobChecklistPhotosPanel } from "@/components/services/JobChecklistPhotosPanel";
import { UpdateJobStageForm } from "@/components/services/UpdateJobStageForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { formatDateTime, SERVICES_DEFAULT_TZ } from "@/lib/services-dates";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceJobDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  if (!session) notFound();

  const job = await getServiceJob(session.organisationId, id);
  if (!job) notFound();

  const { prisma } = await import("@dg/database");
  const [org, members, entityQuotes, contactQuotes, activitiesResult] =
    await Promise.all([
      prisma.organisation.findUnique({
        where: { id: session.organisationId },
        select: { settings: true, timezone: true },
      }),
      listOrganisationMembers(session.organisationId),
      listQuotesForEntity(session.organisationId, "ServiceJob", job.id),
      job.contactId
        ? prisma.commerceQuote.findMany({
            where: { organisationId: session.organisationId, contactId: job.contactId },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      listOrganisationActivities({
        organisationId: session.organisationId,
        entityType: "ServiceJob",
        entityId: job.id,
        limit: 40,
      }),
    ]);

  const timeZone = org?.timezone || SERVICES_DEFAULT_TZ;
  const template = getActiveServiceTemplate(org?.settings);
  const contact = job.contactId
    ? await getContact(session.organisationId, job.contactId)
    : null;

  const quoteMap = new Map<
    string,
    {
      id: string;
      quoteNumber: string | null;
      status: string;
      totalCents: number | null;
      currency: string;
      createdAt: string;
    }
  >();
  for (const q of [...entityQuotes, ...contactQuotes]) {
    quoteMap.set(q.id, {
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      totalCents: q.totalCents,
      currency: q.currency,
      createdAt:
        typeof q.createdAt === "string" ? q.createdAt : q.createdAt.toISOString(),
    });
  }
  if (job.quoteId && !quoteMap.has(job.quoteId)) {
    const linked = await prisma.commerceQuote.findFirst({
      where: { id: job.quoteId, organisationId: session.organisationId },
    });
    if (linked) {
      quoteMap.set(linked.id, {
        id: linked.id,
        quoteNumber: linked.quoteNumber,
        status: linked.status,
        totalCents: linked.totalCents,
        currency: linked.currency,
        createdAt: linked.createdAt.toISOString(),
      });
    }
  }

  const memberOptions = members.map((m) => ({
    clerkUserId: m.clerkUserId,
    label: m.displayName?.trim() || m.email || m.clerkUserId.slice(0, 8),
  }));
  const stageLabel =
    template.workflow.find((s) => s.id === job.stage)?.label ??
    job.stage.replace(/_/g, " ");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/services/jobs" className="text-sm text-sky-400 hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{job.title}</h1>
        <p className="text-sm text-slate-400">
          {stageLabel} · {job.status}
          {job.scheduledStartAt
            ? ` · ${formatDateTime(job.scheduledStartAt, timeZone)}`
            : ""}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Stage</p>
          <UpdateJobStageForm
            jobId={job.id}
            currentStage={job.stage}
            stages={template.workflow}
          />
        </div>
        <EditServiceJobForm
          job={job}
          jobTypes={template.jobTypes}
          jobFields={template.jobFields}
          members={memberOptions}
          quotes={[...quoteMap.values()]}
          contact={
            contact
              ? {
                  id: contact.id,
                  label: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
                }
              : null
          }
          customerLabel={template.terminology.customer}
          quoteLabel={template.terminology.quote}
        />
        <JobChecklistPhotosPanel jobId={job.id} metadata={job.metadata} />
        <section className="dg-card">
          <h2 className="font-semibold text-white">Activity</h2>
          {!activitiesResult.items.length ? (
            <p className="mt-3 text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {activitiesResult.items.map((activity) => (
                <li key={activity.id} className="border-l-2 border-sky-600/50 pl-4">
                  <p className="font-medium text-white">{activity.title}</p>
                  {activity.body ? (
                    <p className="text-sm text-slate-400">{activity.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.activityType} · {activity.sourceApp ?? "services"} ·{" "}
                    {formatDateTime(activity.createdAt, timeZone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <AddServiceJobNoteForm jobId={job.id} />
        </section>
      </main>
    </>
  );
}
