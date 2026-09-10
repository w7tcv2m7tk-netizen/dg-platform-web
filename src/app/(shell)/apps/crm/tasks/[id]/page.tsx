import Link from "next/link";
import {
  getCompany,
  getContact,
  getOpportunity,
  getOrganisationById,
  getTask,
  listOrganisationMembers,
  sessionHasFeature,
} from "@dg/platform-core";
import { notFound } from "next/navigation";

import { EditTaskForm } from "@/components/crm/EditTaskForm";
import { formatDateTimeInTimeZone, safeTimeZone } from "@/lib/organisation-timezone";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function contactLabel(contact: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return (
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    contact.email ||
    contact.phone ||
    "Contact"
  );
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthorisedPlatformPageSession("crm.tasks.read");
  if (!session) notFound();

  const [task, organisation] = await Promise.all([
    getTask(session.organisationId, id),
    getOrganisationById(session.organisationId),
  ]);
  if (!task) notFound();
  const displayTimeZone = safeTimeZone(organisation?.timezone);

  const canWrite = sessionHasFeature(session, "crm.tasks.write");
  const canReadContacts = sessionHasFeature(session, "crm.contacts.read");
  const canReadCompanies = sessionHasFeature(session, "crm.companies.read");
  const canReadOpportunities = sessionHasFeature(session, "crm.opportunities.read");

  const [members, directContact, directCompany, opportunity] = await Promise.all([
    task.assignedUserId
      ? listOrganisationMembers(session.organisationId)
      : Promise.resolve([]),
    task.entityType === "Contact" && task.entityId && canReadContacts
      ? getContact(session.organisationId, task.entityId)
      : Promise.resolve(null),
    task.entityType === "Company" && task.entityId && canReadCompanies
      ? getCompany(session.organisationId, task.entityId)
      : Promise.resolve(null),
    task.entityType === "Opportunity" && task.entityId && canReadOpportunities
      ? getOpportunity(session.organisationId, task.entityId)
      : Promise.resolve(null),
  ]);

  const opportunityContact =
    opportunity?.contactId && canReadContacts
      ? await getContact(session.organisationId, opportunity.contactId)
      : null;
  const contactForCompany = directContact ?? opportunityContact;
  const relatedCompanyId =
    directCompany?.id ?? opportunity?.companyId ?? contactForCompany?.companyId ?? null;
  const relatedCompany =
    relatedCompanyId && canReadCompanies
      ? directCompany ?? (await getCompany(session.organisationId, relatedCompanyId))
      : null;

  const assignedMember = task.assignedUserId
    ? members.find(
        (member) =>
          member.id === task.assignedUserId || member.clerkUserId === task.assignedUserId,
      ) ?? null
    : null;
  const assignedLabel = assignedMember
    ? assignedMember.displayName || assignedMember.email || "Assigned teammate"
    : task.assignedUserId
      ? "Assigned teammate"
      : "Unassigned";

  let relatedLabel = "None";
  let relatedHref: string | null = null;
  let relatedActionLabel: string | null = null;

  if (task.entityType === "Contact" && directContact) {
    relatedLabel = [contactLabel(directContact), relatedCompany?.name].filter(Boolean).join(" · ");
    relatedHref = `/apps/crm/contacts/${directContact.id}`;
    relatedActionLabel = "Open contact";
  } else if (task.entityType === "Company" && directCompany) {
    relatedLabel = directCompany.name;
    relatedHref = `/apps/crm/companies/${directCompany.id}`;
    relatedActionLabel = "Open company";
  } else if (task.entityType === "Opportunity" && opportunity) {
    const customer = opportunityContact ? contactLabel(opportunityContact) : null;
    relatedLabel = [customer, relatedCompany?.name, opportunity.title].filter(Boolean).join(" · ");
    relatedHref = `/apps/crm/opportunities/${opportunity.id}`;
    relatedActionLabel = "Open opportunity";
  } else if (task.entityType && task.entityId) {
    relatedLabel = "Linked record unavailable or restricted";
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/tasks" className="text-sm text-blue-400 hover:underline">
          ← Tasks
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {task.status} · {task.priority || "normal priority"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Times shown in {displayTimeZone}.</p>
          </div>
          {relatedHref && relatedActionLabel ? (
            <Link href={relatedHref} className="dg-btn dg-btn-secondary">
              {relatedActionLabel}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="dg-page-main space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Due</p>
            <p className="mt-2 text-sm text-white">{formatDateTimeInTimeZone(task.dueAt, displayTimeZone)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
            <p className="mt-2 text-sm text-white">{formatDateTimeInTimeZone(task.createdAt, displayTimeZone)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Updated</p>
            <p className="mt-2 text-sm text-white">{formatDateTimeInTimeZone(task.updatedAt, displayTimeZone)}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
            <p className="mt-2 text-sm text-white">{formatDateTimeInTimeZone(task.completedAt, displayTimeZone)}</p>
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Task details</h2>
          {canWrite ? (
            <div className="mt-4">
              <EditTaskForm task={task} />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {task.description || "No additional details have been added."}
              </p>
              <p className="text-sm text-slate-500">You have read-only access to Tasks.</p>
            </div>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Context</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Assigned to</dt>
              <dd className="mt-1 text-slate-300">{assignedLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="mt-1 text-slate-300">{task.sourceApp || "CRM"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Related record</dt>
              <dd className="mt-1 text-slate-300">
                {relatedHref ? (
                  <Link href={relatedHref} className="text-blue-400 hover:underline">
                    {relatedLabel}
                  </Link>
                ) : (
                  relatedLabel
                )}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
