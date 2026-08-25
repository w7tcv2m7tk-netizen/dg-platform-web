"use client";

import Link from "next/link";
import type { ConversationSummary } from "@dg/platform-core";

import type { InboxContactContext } from "./CommunicationsInboxWorkspace";

export function ConversationContextPanel({
  conversation,
  contact,
}: {
  conversation: ConversationSummary | null;
  contact: InboxContactContext | null;
}) {
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-xs text-slate-600">
        CRM context
      </div>
    );
  }

  const name = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
    : conversation.contactName;
  const email = contact?.email || conversation.fromAddress || conversation.toAddresses[0];
  const composeParams = new URLSearchParams();
  if (conversation.contactId) composeParams.set("contactId", conversation.contactId);
  if (email) composeParams.set("to", email);
  if (conversation.subject) {
    composeParams.set(
      "subject",
      conversation.subject.startsWith("Re:")
        ? conversation.subject
        : `Re: ${conversation.subject}`,
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        CRM context
      </p>

      {conversation.contactId && (contact || name) ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-white">{name || "Contact"}</p>
          {email ? <p className="truncate text-xs text-slate-400">{email}</p> : null}
          {contact?.phone ? (
            <p className="text-xs text-slate-400">{contact.phone}</p>
          ) : null}
          {contact?.status ? (
            <p className="text-[11px] capitalize text-slate-500">{contact.status}</p>
          ) : null}
          <Link
            href={`/apps/crm/contacts/${conversation.contactId}`}
            className="inline-block text-xs text-sky-400 hover:underline"
          >
            Open in CRM
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          No linked contact yet. Sync or compose with a contact to attach CRM context.
        </p>
      )}

      <div className="mt-6 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Shortcuts
        </p>
        <Link
          href={`/apps/communications/compose?${composeParams.toString()}`}
          className="block rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500"
        >
          Email
        </Link>
        <span
          className="block cursor-not-allowed rounded-md border border-slate-800 px-2.5 py-1.5 text-xs text-slate-600"
          title="Coming soon"
        >
          SMS · soon
        </span>
        <span
          className="block cursor-not-allowed rounded-md border border-slate-800 px-2.5 py-1.5 text-xs text-slate-600"
          title="Coming soon"
        >
          Call · soon
        </span>
        {conversation.contactId ? (
          <Link
            href={`/apps/crm/tasks?contactId=${conversation.contactId}`}
            className="block rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500"
          >
            Create task
          </Link>
        ) : null}
      </div>

      {(conversation.companyId || conversation.opportunityId) && (
        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Related
          </p>
          {conversation.companyId ? (
            <Link
              href={`/apps/crm/companies/${conversation.companyId}`}
              className="block text-xs text-sky-400 hover:underline"
            >
              Company
            </Link>
          ) : null}
          {conversation.opportunityId ? (
            <Link
              href={`/apps/crm/opportunities/${conversation.opportunityId}`}
              className="block text-xs text-sky-400 hover:underline"
            >
              Opportunity
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
