"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SUPPORT_EMAIL } from "@/lib/support";
import type { SupportChatMessage } from "@/lib/support-chat";

const POLL_MS = 4000;

function formatTime(at: string) {
  const d = new Date(at.includes("T") ? at : at.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function SupportChatPanel({
  embedded = false,
  userName,
  initialDraft,
  onDraftApplied,
}: {
  embedded?: boolean;
  userName?: string;
  initialDraft?: string;
  onDraftApplied?: () => void;
}) {
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [lastId, setLastId] = useState(0);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const applyMessages = useCallback(
    (incoming: SupportChatMessage[], append: boolean) => {
      if (!incoming.length && !append) {
        setMessages([]);
        setLastId(0);
        return;
      }

      setMessages((prev) => {
        const base = append ? prev : [];
        const seen = new Set(base.map((m) => m.id));
        const merged = [...base];
        for (const msg of incoming) {
          if (!seen.has(msg.id)) {
            merged.push(msg);
            seen.add(msg.id);
          }
        }
        return merged.sort((a, b) => a.id - b.id);
      });

      setLastId((prev) => Math.max(prev, ...incoming.map((m) => m.id), 0));
      requestAnimationFrame(scrollToBottom);
    },
    [scrollToBottom],
  );

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/support/conversation");
    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      if (json?.error?.code === "not_linked") {
        setLinked(false);
        setError(json.error.message);
        return;
      }
      setError(json?.error?.message ?? "Unable to load chat");
      return;
    }

    setLinked(true);
    applyMessages(json.data.messages ?? [], false);
  }, [applyMessages]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!initialDraft?.trim()) return;
    setDraft(initialDraft);
    onDraftApplied?.();
  }, [initialDraft, onDraftApplied]);

  useEffect(() => {
    if (!linked || loading) return;

    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/v1/support/messages?after=${lastId}`);
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const incoming = (json?.data?.messages ?? []) as SupportChatMessage[];
      if (incoming.length) applyMessages(incoming, true);
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [linked, loading, lastId, applyMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");
    const res = await fetch("/api/v1/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const json = await res.json().catch(() => null);
    setSending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not send message");
      setDraft(text);
      return;
    }

    applyMessages(json.data.messages ?? [], false);
  }

  const shellClass = embedded
    ? "flex h-[min(520px,70vh)] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
    : "flex h-full flex-col overflow-hidden";

  return (
    <div className={shellClass}>
      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Live support</h3>
        <p className="text-xs text-slate-400">
          Chat with DigitalGate{userName ? ` · ${userName}` : ""} — replies here and by email
        </p>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {loading ? (
          <p className="m-auto text-sm text-slate-500">Loading chat…</p>
        ) : !linked ? (
          <div className="m-auto max-w-xs text-center text-sm text-slate-400">
            <p>{error}</p>
            <Link
              href="https://digitalgate.com.au/onboarding/"
              className="mt-3 inline-block text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Complete onboarding →
            </Link>
          </div>
        ) : error && !messages.length ? (
          <p className="m-auto text-sm text-amber-300">{error}</p>
        ) : messages.length === 0 ? (
          <p className="m-auto text-center text-sm text-slate-500">
            Say hello — we typically reply within a few hours on business days.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "client"
                  ? "ml-auto rounded-br-md bg-blue-600 text-white"
                  : "mr-auto rounded-bl-md border border-slate-700 bg-slate-950 text-slate-200"
              }`}
            >
              <span className="mb-1 block text-[10px] opacity-75">
                {msg.sender} · {formatTime(msg.at)}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: escapeHtml(msg.body).replace(/\n/g, "<br>"),
                }}
              />
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="flex gap-2 border-t border-slate-800 bg-slate-950 p-3"
      >
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={linked ? "Type your message…" : `Email ${SUPPORT_EMAIL}`}
          disabled={!linked || sending}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!linked || sending || !draft.trim()}
          className="self-end rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export function SupportChatWidget({
  userName,
  open: controlledOpen,
  onOpenChange,
  initialDraft,
  onDraftApplied,
}: {
  userName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDraft?: string;
  onDraftApplied?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close live support chat" : "Open live support chat"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xl text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5"
      >
        {open ? "×" : "💬"}
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[min(520px,calc(100vh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <SupportChatPanel
            userName={userName}
            initialDraft={initialDraft}
            onDraftApplied={onDraftApplied}
          />
        </div>
      ) : null}
    </>
  );
}
