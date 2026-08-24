import Link from "next/link";
import { listOrgCommunications } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

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
  { id: "ai", label: "AI" },
  { id: "outreach", label: "Outreach" },
] as const;

export default async function CommunicationsHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { session } = await getPlatformPageContext();
  const filter = (params.filter?.trim() || "all") as
    | "all"
    | "email"
    | "sms"
    | "voice"
    | "automated"
    | "ai"
    | "outreach";

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Communication History</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const rows = process.env.DATABASE_URL
    ? await listOrgCommunications({
        organisationId: session.organisationId,
        filter,
        contactId: params.contactId?.trim() || undefined,
        limit: 100,
      })
    : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">History</h1>
        <p className="mt-1 text-sm text-slate-400">
          Who · what · why · status — across channels.
        </p>
      </header>
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

        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
            Compose email
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No communications match this filter.</p>
        ) : (
          <ul className="divide-y divide-slate-800 border-t border-slate-800">
            {rows.map((row) => (
              <li key={row.id} className="py-4">
                <p className="text-sm font-medium text-white">
                  {row.channel === "email" ? "Email" : row.channel}{" "}
                  {row.direction === "outbound" ? "sent" : "received"}
                  {row.aiGenerated ? " · AI-assisted" : ""}
                  {row.source === "automation" ? " · automated" : ""}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {row.subject || "(no subject)"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  To {row.toAddresses.join(", ") || "—"}
                  {row.sentBy ? ` · Sent by ${row.sentBy}` : ""}
                  {row.sentAt
                    ? ` · ${new Date(row.sentAt).toLocaleString("en-AU")}`
                    : ` · ${new Date(row.createdAt).toLocaleString("en-AU")}`}
                  {" · "}
                  {row.status}
                  {row.provider ? ` · ${row.provider}` : ""}
                </p>
                {row.whySent ? (
                  <p className="mt-2 text-xs text-slate-400">Why: {row.whySent}</p>
                ) : null}
                {row.contactId ? (
                  <Link
                    href={`/apps/crm/contacts/${row.contactId}`}
                    className="mt-2 inline-block text-xs text-sky-400 hover:underline"
                  >
                    Open contact
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
