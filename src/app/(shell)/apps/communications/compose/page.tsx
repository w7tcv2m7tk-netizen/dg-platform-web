import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContact,
  getDefaultCommunicationSignature,
  getOpportunity,
  htmlToPlainSignature,
  sessionHasFeature,
} from "@dg/platform-core";

import { CommunicationsComposeForm } from "@/components/communications/CommunicationsComposeForm";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

interface PageProps {
  searchParams: Promise<{
    contactId?: string;
    opportunityId?: string;
    to?: string;
    subject?: string;
  }>;
}

export default async function CommunicationsComposePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthorisedPlatformPageSession("communications.email.send");
  if (!session) notFound();

  const contactId = params.contactId?.trim();
  const opportunityId = params.opportunityId?.trim();
  const canReadContacts = sessionHasFeature(session, "crm.contacts.read");
  const canReadCompanies = sessionHasFeature(session, "crm.companies.read");
  const canReadOpportunities = sessionHasFeature(session, "crm.opportunities.read");

  const [contact, opportunity, defaultSignature] = process.env.DATABASE_URL
    ? await Promise.all([
        contactId && canReadContacts
          ? getContact(session.organisationId, contactId)
          : Promise.resolve(null),
        opportunityId && canReadOpportunities
          ? getOpportunity(session.organisationId, opportunityId)
          : Promise.resolve(null),
        getDefaultCommunicationSignature(session.organisationId),
      ])
    : [null, null, null];

  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    : undefined;
  const defaultSignaturePlain = defaultSignature
    ? htmlToPlainSignature(defaultSignature.html)
    : undefined;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications/email" className="text-sm text-sky-400 hover:underline">
          ← Email
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Compose email</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manual send with CRM context. Use Send later for Scheduled. AI Assist drafts come next.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsComposeForm
          defaultTo={params.to?.trim() || contact?.email || ""}
          defaultSubject={params.subject?.trim() || ""}
          contactId={contact?.id}
          opportunityId={opportunity?.id}
          companyId={canReadCompanies ? (contact?.companyId ?? undefined) : undefined}
          contactName={contactName}
          defaultSignaturePlain={defaultSignaturePlain}
          defaultSignatureName={defaultSignature?.name}
        />
      </main>
    </>
  );
}
