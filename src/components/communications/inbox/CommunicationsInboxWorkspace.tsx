"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import type {
  ConversationSummary,
  InboxFolderId,
  PlatformCommunication,
} from "@dg/platform-core";

import { InboxFolderNav } from "./InboxFolderNav";
import { ConversationList } from "./ConversationList";
import { ConversationPane } from "./ConversationPane";
import { ConversationContextPanel } from "./ConversationContextPanel";

export type InboxContactContext = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  status?: string | null;
};

export type InboxFolderCounts = Partial<Record<InboxFolderId, number>>;

export function CommunicationsInboxWorkspace({
  conversations,
  selectedKey,
  messages,
  contact,
  folder,
  folderCounts,
  q,
  mailboxConnected,
  mailboxLabel,
  basePath = "/apps/communications",
}: {
  conversations: ConversationSummary[];
  selectedKey: string | null;
  messages: PlatformCommunication[];
  contact: InboxContactContext | null;
  folder: InboxFolderId;
  folderCounts: InboxFolderCounts;
  q: string;
  mailboxConnected: boolean;
  mailboxLabel?: string | null;
  basePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => conversations.find((c) => c.key === selectedKey) ?? null,
    [conversations, selectedKey],
  );

  const pushParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  const onSelectFolder = useCallback(
    (id: InboxFolderId) => {
      pushParams({ folder: id === "all" ? null : id, c: null });
    },
    [pushParams],
  );

  const onSelectConversation = useCallback(
    (key: string) => {
      pushParams({ c: key });
    },
    [pushParams],
  );

  const onSearch = useCallback(
    (value: string) => {
      pushParams({ q: value.trim() || null, c: null });
    },
    [pushParams],
  );

  const emptyAll = conversations.length === 0 && folder === "all" && !q;

  return (
    <div
      className={`flex min-h-[min(70vh,720px)] flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 ${
        pending ? "opacity-90" : ""
      }`}
    >
      {!mailboxConnected && emptyAll ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 px-8 py-12">
          <p className="text-base font-medium text-white">Connect a mailbox to fill Inbox</p>
          <p className="max-w-md text-sm text-slate-400">
            Communications is your CRM interaction layer — providers carry messages; DigitalGate owns
            context. Connect Google Workspace to sync inbound mail, or compose outbound email now.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/apps/communications/mailboxes"
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Connect mailbox
            </Link>
            <Link
              href="/apps/communications/compose"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Compose email
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.2fr)] xl:grid-cols-[200px_minmax(280px,1fr)_minmax(0,1.35fr)_220px]">
          <aside className="hidden min-h-0 border-r border-slate-800 lg:block">
            <InboxFolderNav
              folder={folder}
              counts={folderCounts}
              onSelect={onSelectFolder}
            />
          </aside>

          <section className="flex min-h-0 flex-col border-r border-slate-800">
            <div className="border-b border-slate-800 px-3 py-2 lg:hidden">
              <InboxFolderNav
                folder={folder}
                counts={folderCounts}
                onSelect={onSelectFolder}
                compact
              />
            </div>
            <ConversationList
              conversations={conversations}
              selectedKey={selectedKey}
              q={q}
              onSearch={onSearch}
              onSelect={onSelectConversation}
              mailboxConnected={mailboxConnected}
              mailboxLabel={mailboxLabel}
            />
          </section>

          <section className="flex min-h-0 flex-col border-r border-slate-800 xl:border-r">
            <ConversationPane
              conversation={selected}
              messages={messages}
              basePath={basePath}
            />
          </section>

          <aside className="hidden min-h-0 xl:block">
            <ConversationContextPanel conversation={selected} contact={contact} />
          </aside>
        </div>
      )}
    </div>
  );
}
