import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  getContact,
  getServiceJob,
  listOrganisationMembers,
  listQuotesForEntity,
} from "@dg/platform-core";

import { EditServiceJobForm } from "@/components/services/EditServiceJobForm";
import { ServicesNav } from "@/components/services/ServicesNav";
import { UpdateJobStageForm } from "@/components/services/UpdateJobStageForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

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
  const [org, members, entityQuotes, contactQuotes] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { settings: true },
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
  ]);

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

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/services/jobs" className="text-sm text-sky-400 hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{job.title}</h1>
        <p className="text-sm text-slate-400">
          {job.stage.replace(/_/g, " ")} · {job.status}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ServicesNav active="jobs" />
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
      </main>
    </>
  );
}
