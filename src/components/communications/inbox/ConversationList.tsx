"use client";

import { useState } from "react";
import type { ConversationSummary } from "@dg/platform-core";

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function channelChip(channel: string) {
  if (channel === "email") return "Email";
  if (channel === "sms") return "SMS";
  if (channel === "voice") return "Call";
  return channel;
}

export function ConversationList({
  conversations,
  selectedKey,
  q,
  onSearch,
  onSelect,
  mailboxConnected,
  mailboxLabel,
}: {
  conversations: ConversationSummary[];
  selectedKey: string | null;
  q: string;
  onSearch: (value: string) => void;
  onSelect: (key: string) => void;
  mailboxConnected: boolean;
  mailboxLabel?: string | null;
}) {
  const [draft, setDraft] = useState(q);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-800 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(draft);
          }}
        >
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search subject, from…"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
        </form>
        {mailboxConnected && mailboxLabel ? (
          <p className="mt-2 truncate text-[11px] text-slate-600">Synced · {mailboxLabel}</p>
        ) : null}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <li className="px-4 py-8 text-sm text-slate-500">
            No conversations in this folder
            {q ? ` matching “${q}”` : ""}.
          </li>
        ) : (
          conversations.map((conv) => {
            const active = conv.key === selectedKey;
            const title =
              conv.contactName ||
              conv.fromAddress ||
              conv.toAddresses[0] ||
              "Unknown";
            return (
              <li key={conv.key}>
                <button
                  type="button"
                  onClick={() => onSelect(conv.key)}
                  className={`flex w-full flex-col gap-0.5 border-b border-slate-800/80 px-4 py-3 text-left ${
                    active
                      ? "bg-sky-950/40"
                      : "hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-white">{title}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                      {relativeTime(conv.latestAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {channelChip(conv.channel)}
                    </span>
                    <span className="truncate text-sm text-slate-300">{conv.subject}</span>
                  </div>
                  {conv.preview ? (
                    <p className="line-clamp-1 text-xs text-slate-500">{conv.preview}</p>
                  ) : null}
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{conv.statusLabel}</span>
                    {conv.messageCount > 1 ? <span>· {conv.messageCount} messages</span> : null}
                    {conv.opportunityId ? <span>· Opportunity</span> : null}
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
