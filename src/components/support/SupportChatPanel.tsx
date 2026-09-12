"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SUPPORT_EMAIL } from "@/lib/support";
import type { SupportChatMessage } from "@/lib/support-chat";

const POLL_MS = 4000;
const AIDA_AVATAR = "/aida/aida-avatar.webp";

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
        <div className="flex items-center gap-3">
          <img
            src={AIDA_AVATAR}
            alt="Aida"
            className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover shadow-sm"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">Ask Aida</h3>
            <p className="text-xs text-slate-400">Business Advisor & Platform Support</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Ask Aida for practical business advice, help using DigitalGate or support
          {userName ? ` · ${userName}` : ""}. A human can take over here when needed.
        </p>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {loading ? (
          <p className="m-auto text-sm text-slate-500">Loading Aida…</p>
        ) : !linked ? (
          <div className="m-auto max-w-xs text-center text-sm text-slate-400">
            <p>{error}</p>
            <Link
              href="https://digitalgate.com.au/onboarding/"
              className="mt-3 inline-block text-[color-mix(in_srgb,var(--org-primary,#3b82f6)_82%,white)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Complete onboarding →
            </Link>
          </div>
        ) : error && !messages.length ? (
          <p className="m-auto text-sm text-amber-300">{error}</p>
        ) : messages.length === 0 ? (
          <div className="m-auto max-w-xs text-center">
            <img
              src={AIDA_AVATAR}
              alt=""
              aria-hidden="true"
              className="mx-auto mb-3 h-14 w-14 rounded-full border border-white/10 object-cover opacity-90"
            />
            <p className="text-sm font-medium text-slate-300">How can I help?</p>
            <p className="mt-1 text-sm text-slate-500">
              Ask me about your business, growth priorities, DigitalGate, how to do something, or anything that is not working as expected.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.role === "client";
            const isAi = msg.role === "ai";
            return (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  isClient
                    ? "ml-auto rounded-br-md bg-[var(--org-primary,#3b82f6)] text-white"
                    : isAi
                      ? "mr-auto rounded-bl-md border border-emerald-500/40 bg-emerald-950/60 text-emerald-50"
                      : "mr-auto rounded-bl-md border border-slate-700 bg-slate-950 text-slate-200"
                }`}
              >
                <span className="mb-1 block text-[10px] opacity-75">
                  {isAi ? "Aida" : msg.sender} · {formatTime(msg.at)}
                </span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(msg.body).replace(/\n/g, "<br>"),
                  }}
                />
              </div>
            );
          })
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
          placeholder={linked ? "Ask Aida anything…" : `Email ${SUPPORT_EMAIL}`}
          disabled={!linked || sending}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!linked || sending || !draft.trim()}
          className="self-end rounded-xl bg-[var(--org-primary,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
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
        aria-label={open ? "Close Ask Aida" : "Ask Aida for business advice or platform support"}
        aria-expanded={open}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/95 p-1.5 pr-4 text-white shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 md:bottom-6 md:right-6"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-900">
          {open ? (
            <span className="text-2xl leading-none">×</span>
          ) : (
            <img src={AIDA_AVATAR} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold">Ask Aida</span>
          <span className="block text-[11px] text-slate-400">Business Advisor</span>
        </span>
      </button>

      {open ? (
        <div className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-[min(560px,calc(100vh-11rem-env(safe-area-inset-bottom)))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl md:bottom-24 md:right-6 md:h-[min(560px,calc(100vh-120px))]">
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
