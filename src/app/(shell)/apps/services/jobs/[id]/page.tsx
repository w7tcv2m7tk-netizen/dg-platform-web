import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getActiveServiceTemplate,
  getContact,
  getServiceJob,
} from "@dg/platform-core";

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
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });
  const template = getActiveServiceTemplate(org?.settings);
  const contact = job.contactId
    ? await getContact(session.organisationId, job.contactId)
    : null;

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
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dg-card space-y-4">
            <h2 className="font-semibold text-white">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Stage</dt>
                <dd className="mt-1">
                  <UpdateJobStageForm
                    jobId={job.id}
                    currentStage={job.stage}
                    stages={template.workflow}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="text-white">{job.jobType?.replace(/_/g, " ") ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Site</dt>
                <dd className="text-white">{job.siteAddress ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Scheduled</dt>
                <dd className="text-white">
                  {job.scheduledStartAt
                    ? new Date(job.scheduledStartAt).toLocaleString("en-AU")
                    : "—"}
                </dd>
              </div>
              {job.description ? (
                <div>
                  <dt className="text-slate-500">Description</dt>
                  <dd className="whitespace-pre-wrap text-white">{job.description}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="dg-card space-y-3">
            <h2 className="font-semibold text-white">{template.terminology.customer}</h2>
            {contact ? (
              <Link
                href={`/apps/crm/contacts/${contact.id}`}
                className="text-sky-400 hover:underline"
              >
                {[contact.firstName, contact.lastName].filter(Boolean).join(" ")} →
              </Link>
            ) : (
              <p className="text-sm text-slate-500">No customer linked</p>
            )}
            <p className="text-xs text-slate-500">
              Quotes & invoices use Commerce · Reviews after completion via Reviews App
            </p>
            <Link
              href="/apps/commerce/quotes"
              className="inline-block text-sm text-sky-400 hover:underline"
            >
              Open Commerce quotes →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
