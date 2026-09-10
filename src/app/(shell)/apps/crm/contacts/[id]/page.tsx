import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BUSINESS_REFERRAL_COMPLIANCE_NOTE,
  canAccessCommandCentre,
  formatTimelineDateTime,
  getContact,
  getContactAccommodationGuestPanel,
  listBusinessReferralsForContact,
  listCompanies,
  listContactActivities,
  sessionHasFeature,
} from "@dg/platform-core";

import { AccommodationGuestPanel } from "@/components/accommodation/AccommodationGuestPanel";
import { AddContactNoteForm } from "@/components/crm/AddContactNoteForm";
import { CreateTaskForm } from "@/components/crm/CreateTaskForm";
import { CrmAiAssistPanel } from "@/components/crm/CrmAiAssistPanel";
import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";
import { EditContactForm } from "@/components/crm/EditContactForm";
import { InviteToFounding10Form } from "@/components/founding/InviteToFounding10Form";
import { BusinessReferralPanel } from "@/components/network/BusinessReferralPanel";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAuthorisedPlatformPageSession("crm.contacts.read");
  if (!session) notFound();

  const contact = await getContact(session.organisationId, id);
  if (!contact) notFound();

  const canWriteContacts = sessionHasFeature(session, "crm.contacts.write");
  const canWriteTasks = sessionHasFeature(session, "crm.tasks.write");
  const canReadCompanies = sessionHasFeature(session, "crm.companies.read");
  const canReadAccommodationGuests = sessionHasFeature(session, "accommodation.guests.read");
  const canSendEmail = sessionHasFeature(session, "communications.email.send");

  const activities = await listContactActivities(session.organisationId, id);
  const companies = canReadCompanies
    ? (
        await listCompanies({
          organisationId: session.organisationId,
          limit: 100,
        })
      ).items
    : [];
  const company = contact.companyId
    ? companies.find((candidate) => candidate.id === contact.companyId) ?? null
    : null;
  const accommodationGuest = canReadAccommodationGuests
    ? await getContactAccommodationGuestPanel(session.organisationId, id)
    : null;
  const businessReferrals = await listBusinessReferralsForContact(session.organisationId, id);

  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const staff = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{displayName}</h1>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          {canSendEmail ? (
            <Link
              href={
                contact.email
                  ? `/apps/communications/compose?contactId=${encodeURIComponent(contact.id)}&to=${encodeURIComponent(contact.email)}`
                  : `/apps/communications/compose?contactId=${encodeURIComponent(contact.id)}`
              }
              className="text-sky-400 hover:underline"
            >
              Email contact
            </Link>
          ) : null}
          <Link href="/apps/crm/timeline" className="text-slate-400 hover:underline">
            Timeline
          </Link>
        </p>
        <p className="text-sm text-slate-400">
          {[contact.email, contact.phone, contact.source].filter(Boolean).join(" · ")}
          {canReadCompanies && company ? (
            <>
              {" · "}
              <Link href={`/apps/crm/companies/${company.id}`} className="text-blue-400 hover:underline">
                {company.name}
              </Link>
            </>
          ) : null}
          {canReadAccommodationGuests && accommodationGuest ? (
            <>
              {" · "}
              <Link href={`/apps/accommodation/guests/${id}`} className="text-blue-400 hover:underline">
                Accommodation Guest
              </Link>
            </>
          ) : null}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">
              {canWriteContacts ? "Edit contact" : "Contact details"}
            </h2>
            {canWriteContacts ? (
              <>
                <div className="mt-4">
                  <EditContactForm contact={contact} companies={companies} />
                </div>
                <CrmDeleteButton
                  resource="contacts"
                  id={contact.id}
                  name={displayName || contact.email || "this contact"}
                  redirectTo="/apps/crm/contacts"
                />
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">You have read-only access to this contact.</p>
            )}
            <dl className="mt-6 space-y-3 border-t border-slate-800 pt-4 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="text-white capitalize">{contact.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="text-white">{new Date(contact.createdAt).toLocaleString("en-AU")}</dd>
              </div>
            </dl>
            {canWriteTasks ? (
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-white">Create task</h3>
                  <Link href="/apps/crm/tasks" className="text-sm text-sky-400 hover:underline">
                    All tasks →
                  </Link>
                </div>
                <CreateTaskForm entityType="Contact" entityId={contact.id} compact />
              </div>
            ) : null}
          </div>

          {staff && canWriteContacts ? (
            <InviteToFounding10Form
              contactId={contact.id}
              defaultName={displayName}
              defaultEmail={contact.email ?? undefined}
              defaultPhone={contact.phone ?? undefined}
              defaultBusinessName={canReadCompanies ? company?.name : undefined}
            />
          ) : null}

          <CrmAiAssistPanel contactId={contact.id} variant="contact" />

          <BusinessReferralPanel
            contactId={contact.id}
            industry={canReadCompanies ? company?.industry : undefined}
            referrals={businessReferrals}
            complianceNote={BUSINESS_REFERRAL_COMPLIANCE_NOTE}
            canWrite={canWriteContacts}
          />

          <div className="dg-card">
            <h2 className="font-semibold text-white">Timeline</h2>
            {!activities?.length ? (
              <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="border-l-2 border-blue-600/50 pl-4">
                    <p className="font-medium text-white">{activity.title}</p>
                    {activity.body ? <p className="text-sm text-slate-400">{activity.body}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.activityType} · {activity.sourceApp ?? "platform"} ·{" "}
                      {formatTimelineDateTime(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {canWriteContacts ? <AddContactNoteForm contactId={contact.id} /> : null}
          </div>
        </div>

        {canReadAccommodationGuests && accommodationGuest ? (
          <div className="mt-8">
            <AccommodationGuestPanel guest={accommodationGuest} showContactLink={false} />
          </div>
        ) : null}
      </main>
    </>
  );
}
