"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { InboxFolderId } from "@dg/platform-core";

import type { InboxFolderCounts } from "./CommunicationsInboxWorkspace";

const WORK: { id: InboxFolderId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_reply", label: "Needs reply" },
];

const CHANNELS: { id: InboxFolderId; label: string }[] = [
  { id: "email", label: "Email" },
];

const TYPES: { id: InboxFolderId; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "automated", label: "Automated" },
  { id: "ai", label: "AI" },
  { id: "mailbox", label: "Mailbox" },
];

const MANAGEMENT = [
  { href: "/apps/communications/templates", label: "Templates" },
  { href: "/apps/communications/signatures", label: "Signatures" },
  { href: "/apps/communications/mailboxes", label: "Mailboxes" },
] as const;

function FolderButton({
  id,
  label,
  active,
  count,
  onSelect,
}: {
  id: InboxFolderId;
  label: string;
  active: boolean;
  count?: number;
  onSelect: (id: InboxFolderId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${
        active
          ? "bg-sky-600/20 text-sky-200"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="tabular-nums text-xs text-slate-500">{count}</span>
      ) : null}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </p>
      {children}
    </div>
  );
}

export function InboxFolderNav({
  folder,
  counts,
  onSelect,
  compact = false,
}: {
  folder: InboxFolderId;
  counts: InboxFolderCounts;
  onSelect: (id: InboxFolderId) => void;
  compact?: boolean;
}) {
  if (compact) {
    const all = [...WORK, ...CHANNELS, ...TYPES];
    return (
      <div className="flex flex-wrap gap-1">
        {all.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`rounded-full px-2.5 py-1 text-xs ${
              folder === item.id
                ? "bg-sky-600 text-white"
                : "border border-slate-700 text-slate-400"
            }`}
          >
            {item.label}
            {counts[item.id] && counts[item.id]! > 0 ? ` · ${counts[item.id]}` : ""}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="flex h-full flex-col overflow-y-auto px-2 pb-4" aria-label="Inbox folders">
      <Section title="Work">
        {WORK.map((item) => (
          <FolderButton
            key={item.id}
            {...item}
            active={folder === item.id}
            count={counts[item.id]}
            onSelect={onSelect}
          />
        ))}
      </Section>
      <Section title="Channels">
        {CHANNELS.map((item) => (
          <FolderButton
            key={item.id}
            {...item}
            active={folder === item.id}
            count={counts[item.id]}
            onSelect={onSelect}
          />
        ))}
      </Section>
      <Section title="Types">
        {TYPES.map((item) => (
          <FolderButton
            key={item.id}
            {...item}
            active={folder === item.id}
            count={counts[item.id]}
            onSelect={onSelect}
          />
        ))}
      </Section>
      <Section title="Management">
        {MANAGEMENT.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2.5 py-1.5 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          >
            {item.label}
          </Link>
        ))}
      </Section>
    </nav>
  );
}
