import Link from "next/link";
import { getContact } from "@dg/platform-core";

import { CommunicationsComposeForm } from "@/components/communications/CommunicationsComposeForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";

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
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Compose</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const contactId = params.contactId?.trim();
  const contact =
    contactId && process.env.DATABASE_URL
      ? await getContact(session.organisationId, contactId)
      : null;
  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    : undefined;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Compose email</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manual send with CRM context. AI Assist drafts come next — human reviews, human sends.
        </p>
      </header>
      <main className="dg-page-main">
        <CommunicationsComposeForm
          defaultTo={params.to?.trim() || contact?.email || ""}
          defaultSubject={params.subject?.trim() || ""}
          contactId={contact?.id}
          opportunityId={params.opportunityId?.trim()}
          companyId={contact?.companyId ?? undefined}
          contactName={contactName}
        />
      </main>
    </>
  );
}
