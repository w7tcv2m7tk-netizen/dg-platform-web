"use client";

import Link from "next/link";
import type { ConversationSummary, PlatformCommunication } from "@dg/platform-core";

function provenanceBadge(msg: PlatformCommunication): {
  label: string;
  className: string;
} {
  if (msg.aiGenerated || msg.source === "ai_assist") {
    return { label: "AI", className: "bg-violet-900/50 text-violet-200" };
  }
  if (msg.source === "automation") {
    return { label: "AUTOMATION", className: "bg-amber-900/40 text-amber-200" };
  }
  if (msg.source === "mailbox") {
    return { label: "MAILBOX", className: "bg-sky-900/40 text-sky-200" };
  }
  if (msg.source === "system") {
    return { label: "SYSTEM", className: "bg-slate-700/60 text-slate-300" };
  }
  return { label: "HUMAN", className: "bg-emerald-900/40 text-emerald-200" };
}

function replyHref(conversation: ConversationSummary | null): string | null {
  if (!conversation) return null;
  const subject = conversation.subject.startsWith("Re:")
    ? conversation.subject
    : `Re: ${conversation.subject}`;
  const params = new URLSearchParams();
  params.set("subject", subject);
  if (conversation.contactId) params.set("contactId", conversation.contactId);
  if (conversation.opportunityId) params.set("opportunityId", conversation.opportunityId);
  const to =
    conversation.direction === "inbound"
      ? conversation.fromAddress
      : conversation.toAddresses[0];
  if (to) params.set("to", to);
  return `/apps/communications/compose?${params.toString()}`;
}

export function ConversationPane({
  conversation,
  messages,
}: {
  conversation: ConversationSummary | null;
  messages: PlatformCommunication[];
  basePath?: string;
}) {
  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-slate-500">
        Select a conversation
      </div>
    );
  }

  const reply = replyHref(conversation);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-white">{conversation.subject}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {conversation.contactName ||
              conversation.fromAddress ||
              conversation.toAddresses.join(", ") ||
              "—"}
            {conversation.messageCount > 1
              ? ` · ${conversation.messageCount} messages`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
            Email
          </span>
          <span
            className="cursor-not-allowed rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-600"
            title="SMS coming in a later phase"
          >
            SMS · soon
          </span>
          {reply ? (
            <Link
              href={reply}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Reply
            </Link>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages in this thread.</p>
        ) : (
          messages.map((msg) => {
            const badge = provenanceBadge(msg);
            const when = msg.sentAt || msg.createdAt;
            const body = msg.bodyHtml?.trim()
              ? null
              : msg.bodyPreview?.trim() || "(no body)";
            return (
              <article
                key={msg.id}
                className={`rounded-lg border px-4 py-3 ${
                  msg.direction === "outbound"
                    ? "border-slate-700/80 bg-slate-900/50"
                    : "border-slate-800 bg-slate-950/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="capitalize">{msg.direction}</span>
                  <span>·</span>
                  <span>{msg.status}</span>
                  <span>·</span>
                  <time dateTime={when}>
                    {new Date(when).toLocaleString("en-AU")}
                  </time>
                </div>
                {msg.fromAddress || msg.toAddresses.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {msg.direction === "inbound"
                      ? `From ${msg.fromAddress || "—"}`
                      : `To ${msg.toAddresses.join(", ") || "—"}`}
                  </p>
                ) : null}
                {msg.whySent ? (
                  <p className="mt-1 text-xs text-slate-500">Why: {msg.whySent}</p>
                ) : null}
                {msg.bodyHtml?.trim() ? (
                  <div
                    className="prose prose-invert prose-sm mt-3 max-w-none text-slate-300"
                    dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                  />
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{body}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
