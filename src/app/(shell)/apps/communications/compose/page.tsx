import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
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
      <SectionPageHeader section="Communications" title="Compose email" description="Send a manual email with CRM context and your organisation signature." />
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
