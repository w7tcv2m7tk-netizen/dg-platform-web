import Link from "next/link";
import type { ReactNode } from "react";
import type { PlatformCommunication } from "@dg/platform-core";

export function CommunicationsList({
  rows,
  empty,
  showScheduledAt = false,
}: {
  rows: PlatformCommunication[];
  empty: ReactNode;
  showScheduledAt?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">{empty}</div>;
  }

  return (
    <ul className="divide-y divide-slate-800 border-t border-slate-800">
      {rows.map((row) => (
        <li key={row.id} className="py-4">
          <p className="text-sm font-medium text-white">
            {row.channel === "email" ? "Email" : row.channel}{" "}
            {row.direction === "outbound" ? "outbound" : "inbound"}
            {row.aiGenerated ? " · AI-assisted" : ""}
            {row.source === "automation" ? " · automated" : ""}
            {row.source === "system" ? " · system" : ""}
            {row.source === "mailbox" ? " · mailbox" : ""}
            {" · "}
            <span className="text-slate-400">{row.status}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">{row.subject || "(no subject)"}</p>
          <p className="mt-1 text-xs text-slate-500">
            To {row.toAddresses.join(", ") || "—"}
            {row.sentBy ? ` · Sent by ${row.sentBy}` : ""}
            {showScheduledAt && row.scheduledAt
              ? ` · scheduled ${new Date(row.scheduledAt).toLocaleString("en-AU")}`
              : row.sentAt
                ? ` · ${new Date(row.sentAt).toLocaleString("en-AU")}`
                : ` · ${new Date(row.createdAt).toLocaleString("en-AU")}`}
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
  );
}

export function CommunicationsSubnav({ active }: { active: string }) {
  const items = [
    { id: "inbox", href: "/apps/communications/inbox", label: "Inbox" },
    { id: "email", href: "/apps/communications/email", label: "Email" },
    { id: "sms", href: "/apps/communications/sms", label: "SMS" },
    { id: "calls", href: "/apps/communications/calls", label: "Calls" },
    { id: "outreach", href: "/apps/communications/outreach", label: "Outreach" },
    { id: "templates", href: "/apps/communications/templates", label: "Templates" },
    { id: "signatures", href: "/apps/communications/signatures", label: "Signatures" },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2 text-xs" aria-label="Communications">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={
              isActive
                ? "rounded-full bg-sky-600 px-3 py-1 text-white"
                : "rounded-full border border-slate-700 px-3 py-1 text-slate-400 hover:border-slate-500"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
