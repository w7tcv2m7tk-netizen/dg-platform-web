import { Suspense } from "react";
import Link from "next/link";
import {
  getContact,
  getConversationMessages,
  getOrgGoogleGmailConnectorTokens,
  listCommunicationConversations,
  type ConversationSummary,
  type InboxFolderId,
} from "@dg/platform-core";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import {
  CommunicationsInboxWorkspace,
  type InboxContactContext,
  type InboxFolderCounts,
} from "@/components/communications/inbox/CommunicationsInboxWorkspace";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const FOLDER_IDS: InboxFolderId[] = [
  "all",
  "needs_reply",
  "email",
  "manual",
  "automated",
  "ai",
  "mailbox",
];

function parseFolder(raw: string | undefined): InboxFolderId {
  if (raw && (FOLDER_IDS as string[]).includes(raw)) return raw as InboxFolderId;
  return "all";
}

function matchesFolder(conv: ConversationSummary, folder: InboxFolderId): boolean {
  if (folder === "all") return true;
  if (folder === "needs_reply") return conv.needsReply;
  if (folder === "email") return conv.channel === "email";
  if (folder === "manual") return conv.source === "manual";
  if (folder === "automated") return conv.source === "automation";
  if (folder === "ai") return conv.aiGenerated || conv.source === "ai_assist";
  if (folder === "mailbox") return conv.source === "mailbox";
  return true;
}

function buildCounts(all: ConversationSummary[]): InboxFolderCounts {
  const counts: InboxFolderCounts = { all: all.length };
  for (const id of FOLDER_IDS) {
    if (id === "all") continue;
    const n = all.filter((c) => matchesFolder(c, id)).length;
    if (n > 0) counts[id] = n;
  }
  return counts;
}

export async function loadCommunicationsInbox(searchParams: {
  c?: string;
  folder?: string;
  q?: string;
}) {
  const { session } = await getPlatformPageContext();
  if (!session?.organisationId) {
    return { session: null as null };
  }

  const folder = parseFolder(searchParams.folder);
  const q = searchParams.q?.trim() ?? "";
  const selectedKey = searchParams.c?.trim() || null;

  const [allConversations, gmailTokens] = process.env.DATABASE_URL
    ? await Promise.all([
        listCommunicationConversations({
          organisationId: session.organisationId,
          folder: "all",
          q: q || undefined,
          limit: 150,
        }),
        getOrgGoogleGmailConnectorTokens(session.organisationId),
      ])
    : [[], null];

  const mailboxConnected = Boolean(
    gmailTokens?.accessToken || gmailTokens?.refreshToken,
  );
  const folderCounts = buildCounts(allConversations);
  const conversations = allConversations.filter((c) => matchesFolder(c, folder));

  let resolvedKey = selectedKey;
  if (resolvedKey && !conversations.some((c) => c.key === resolvedKey)) {
    resolvedKey = null;
  }
  if (!resolvedKey && conversations[0]) {
    resolvedKey = conversations[0].key;
  }

  const selected = conversations.find((c) => c.key === resolvedKey) ?? null;

  const [messages, contactRow] =
    process.env.DATABASE_URL && resolvedKey
      ? await Promise.all([
          getConversationMessages(session.organisationId, resolvedKey),
          selected?.contactId
            ? getContact(session.organisationId, selected.contactId)
            : Promise.resolve(null),
        ])
      : [[], null];

  const contact: InboxContactContext | null = contactRow
    ? {
        id: contactRow.id,
        firstName: contactRow.firstName,
        lastName: contactRow.lastName,
        email: contactRow.email,
        phone: contactRow.phone,
        companyId: contactRow.companyId,
        status: contactRow.status,
      }
    : null;

  return {
    session,
    folder,
    q,
    conversations,
    selectedKey: resolvedKey,
    messages,
    contact,
    folderCounts,
    mailboxConnected,
    mailboxLabel: gmailTokens?.label ?? null,
  };
}

export async function CommunicationsInboxView({
  searchParams,
  basePath = "/apps/communications",
}: {
  searchParams: Promise<{ c?: string; folder?: string; q?: string }> | {
    c?: string;
    folder?: string;
    q?: string;
  };
  basePath?: string;
}) {
  const params = await Promise.resolve(searchParams);
  const data = await loadCommunicationsInbox(params);

  if (!data.session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-slate-400">
          Conversations across mailboxes and CRM — for {data.session.organisationName}.
        </p>
      </header>
      <main className="dg-page-main flex min-h-0 flex-col gap-4">
        <CommunicationsSubnav active="inbox" />
        <Suspense
          fallback={
            <div className="rounded-xl border border-slate-800 px-6 py-12 text-sm text-slate-500">
              Loading inbox…
            </div>
          }
        >
          <CommunicationsInboxWorkspace
            conversations={data.conversations}
            selectedKey={data.selectedKey}
            messages={data.messages}
            contact={data.contact}
            folder={data.folder}
            folderCounts={data.folderCounts}
            q={data.q}
            mailboxConnected={data.mailboxConnected}
            mailboxLabel={data.mailboxLabel}
            basePath={basePath}
          />
        </Suspense>
        {!data.mailboxConnected && data.conversations.length > 0 ? (
          <p className="text-xs text-slate-500">
            Mailbox not connected —{" "}
            <Link href="/apps/communications/mailboxes" className="text-sky-400 hover:underline">
              connect Google Workspace
            </Link>{" "}
            to sync inbound mail. Manual sends still appear here.
          </p>
        ) : null}
      </main>
    </>
  );
}
