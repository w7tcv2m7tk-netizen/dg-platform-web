import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
import { notFound } from "next/navigation";
import { getContact, listOrgCommunications, sessionHasFeature } from "@dg/platform-core";

import { CommunicationsList } from "@/components/communications/CommunicationsList";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    contactId?: string;
  }>;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "voice", label: "Voice" },
  { id: "automated", label: "Automated" },
  { id: "system", label: "System" },
  { id: "mailbox", label: "Mailbox" },
  { id: "ai", label: "AI" },
  { id: "outreach", label: "Outreach" },
] as const;

export default async function CommunicationsHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const filter = (params.filter?.trim() || "all") as
    | "all"
    | "email"
    | "sms"
    | "voice"
    | "automated"
    | "system"
    | "mailbox"
    | "ai"
    | "outreach";

  const requestedContactId = params.contactId?.trim();
  let contactId: string | undefined;
  if (requestedContactId && sessionHasFeature(session, "crm.contacts.read")) {
    const contact = await getContact(session.organisationId, requestedContactId);
    contactId = contact?.id;
  }

  const rows = process.env.DATABASE_URL
    ? await listOrgCommunications({
        organisationId: session.organisationId,
        filter,
        contactId,
        limit: 100,
      })
    : [];
  const canSendEmail = sessionHasFeature(session, "communications.email.send");

  return (
    <>
      <SectionPageHeader section="Communications" title="History" description="Who · what · why · status — across channels recorded by DigitalGate." />
      <main className="dg-page-main space-y-6">
        <div className="flex flex-wrap gap-2 text-xs">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const href =
              f.id === "all"
                ? "/apps/communications/history"
                : `/apps/communications/history?filter=${f.id}`;
            return (
              <Link
                key={f.id}
                href={href}
                className={
                  active
                    ? "rounded-full bg-sky-600 px-3 py-1 text-white"
                    : "rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:border-slate-500"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <CommunicationsList
          rows={rows}
          empty={
            <>
              No communications match this filter for {session.organisationName}.
              <span className="mt-2 block">
                History shows communications recorded by DigitalGate and mailbox activity after you{" "}
                <Link href="/apps/communications/mailboxes" className="text-sky-400 hover:underline">
                  connect a supported mailbox
                </Link>
                .
              </span>
              {canSendEmail ? (
                <span className="mt-2 block">
                  <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
                    Compose an email
                  </Link>{" "}
                  to create the first email record.
                </span>
              ) : null}
            </>
          }
        />
      </main>
    </>
  );
}
