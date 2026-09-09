"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import styles from "./AskAidaWidget.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type PanelState =
  | "ready"
  | "booting"
  | "thinking"
  | "error"
  | "rate_limited"
  | "capture"
  | "captured";

type QuickActionId =
  | "help_my_business"
  | "show_platform"
  | "what_is_brain"
  | "talk_to_someone";

const TOKEN_KEY = "dg_aida_conversation_token";
const AVATAR = "/aida/aida-avatar.webp";

/** Keep in lockstep with AIDA_QUICK_ACTIONS in platform-core identity. */
const QUICK_ACTIONS: { id: QuickActionId; label: string; prompt: string }[] = [
  {
    id: "help_my_business",
    label: "How could DigitalGate help my business?",
    prompt: "How could DigitalGate help my business?",
  },
  {
    id: "show_platform",
    label: "Show me the platform",
    prompt: "Show me the platform",
  },
  {
    id: "what_is_brain",
    label: "What is Business Brain?",
    prompt: "What is Business Brain?",
  },
  {
    id: "talk_to_someone",
    label: "I’d like to talk to someone",
    prompt: "I’d like to talk to someone",
  },
];

function readToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeToken(token: string) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode / quota */
  }
}

export function AskAidaWidget({
  siteSlug,
  pageSlug,
}: {
  siteSlug: string;
  pageSlug?: string;
}) {
  const titleId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PanelState>("ready");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [lastPrompt, setLastPrompt] = useState<{
    text: string;
    quickActionId?: QuickActionId;
  } | null>(null);
  const [capture, setCapture] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    website: "",
  });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  async function api(body: Record<string, unknown>) {
    const res = await fetch("/api/public/aida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteSlug,
        pageSlug,
        token: token || readToken(),
        honeypot,
        ...body,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      data?: {
        token?: string;
        messages?: ChatMessage[];
        action?: string;
        leadCaptured?: boolean;
        status?: string;
      };
      error?: { code?: string; message?: string };
    };
    return { res, json };
  }

  function rememberToken(next?: string) {
    if (!next) return;
    setToken(next);
    writeToken(next);
  }

  async function bootstrap() {
    setError(null);
    setState("booting");
    const { res, json } = await api({ action: "bootstrap" });
    if (res.status === 429) {
      setState("rate_limited");
      setError(json.error?.message ?? "Please wait a moment.");
      return;
    }
    if (!res.ok || !json.data) {
      setState("error");
      setError(json.error?.message ?? "Aida is unavailable right now.");
      return;
    }
    rememberToken(json.data.token);
    setMessages(json.data.messages ?? []);
    setState(json.data.leadCaptured ? "captured" : "ready");
    requestAnimationFrame(scrollToEnd);
  }

  async function openPanel() {
    setOpen(true);
    if (messages.length === 0) await bootstrap();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function send(text: string, quickActionId?: QuickActionId) {
    const value = text.trim();
    if (!value || state === "thinking" || state === "booting") return;
    setDraft("");
    setError(null);
    setLastPrompt({ text: value, quickActionId });
    setState("thinking");
    setMessages((prev) => [
      ...prev,
      {
        id: `local_${Date.now()}`,
        role: "user",
        content: value,
        createdAt: new Date().toISOString(),
      },
    ]);
    requestAnimationFrame(scrollToEnd);
    const { res, json } = await api({
      action: "message",
      text: value,
      quickActionId,
    });
    if (res.status === 429) {
      setState("rate_limited");
      setError(json.error?.message ?? "Too many messages. Please wait.");
      return;
    }
    if (res.status === 404) {
      writeToken("");
      setToken("");
      setState("error");
      setError("This conversation expired. Retry to start a new one.");
      return;
    }
    if (!res.ok || !json.data) {
      setState("error");
      setError(json.error?.message ?? "Something went wrong. Try again.");
      return;
    }
    rememberToken(json.data.token);
    setMessages(json.data.messages ?? []);
    if (json.data.action === "capture" || json.data.action === "handoff") {
      setState("capture");
    } else {
      setState("ready");
    }
    requestAnimationFrame(scrollToEnd);
  }

  async function submitCapture(e: FormEvent) {
    e.preventDefault();
    setState("thinking");
    setError(null);
    const { res, json } = await api({
      action: "capture",
      name: capture.name,
      email: capture.email,
      phone: capture.phone,
      businessName: capture.businessName,
      website: capture.website,
    });
    if (!res.ok || !json.data) {
      setState("capture");
      setError(json.error?.message ?? "Could not send those details.");
      return;
    }
    rememberToken(json.data.token);
    setMessages(json.data.messages ?? messages);
    setState("captured");
    requestAnimationFrame(scrollToEnd);
  }

  async function retry() {
    if (messages.length === 0 || !readToken()) {
      await bootstrap();
      return;
    }
    if (lastPrompt) {
      await send(lastPrompt.text, lastPrompt.quickActionId);
      return;
    }
    setState("ready");
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const showQuickActions =
    state === "ready" && !messages.some((m) => m.role === "user");
  const busy = state === "thinking" || state === "booting";

  return (
    <div className={styles.root}>
      {open ? (
        <section
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className={styles.header}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="" width={40} height={40} className={styles.avatar} />
            <div className={styles.titles}>
              <h2 id={titleId}>Aida</h2>
              <p>DigitalGate AI Business Advisor</p>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close Ask Aida"
            >
              Close
            </button>
          </header>

          <div className={styles.log} ref={listRef} aria-live="polite">
            {messages.map((m, index) => (
              <div
                key={m.id}
                className={
                  m.role === "assistant"
                    ? `${styles.bubble} ${styles.assistant}`
                    : `${styles.bubble} ${styles.user}`
                }
              >
                {m.role === "assistant" && index === 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={AVATAR}
                    alt=""
                    width={28}
                    height={28}
                    className={styles.msgAvatar}
                  />
                ) : null}
                <p>{m.content}</p>
              </div>
            ))}
            {state === "booting" ? <p className={styles.boot}>Connecting…</p> : null}
            {state === "thinking" ? <p className={styles.thinking}>Aida is thinking…</p> : null}
            {error ? (
              <p className={styles.error}>
                {error}
                {state === "error" ? (
                  <button type="button" className={styles.retry} onClick={() => void retry()}>
                    Retry
                  </button>
                ) : null}
              </p>
            ) : null}

            {showQuickActions ? (
              <div className={styles.quick}>
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(q.prompt, q.id)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            ) : null}

            {state === "capture" || state === "captured" ? (
              <form className={styles.capture} onSubmit={(e) => void submitCapture(e)}>
                {state === "captured" ? (
                  <p className={styles.next}>
                    Next step:{" "}
                    <a href="/contact">Contact DigitalGate</a>
                    {" · "}
                    <a href="/pricing">View pricing</a>
                  </p>
                ) : (
                  <>
                    <p className={styles.captureHint}>
                      Name and email so the DigitalGate team can follow up.
                    </p>
                    <label className={styles.hp}>
                      Company website
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                    <label>
                      Name
                      <input
                        required
                        autoComplete="name"
                        value={capture.name}
                        onChange={(e) => setCapture((c) => ({ ...c, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={capture.email}
                        onChange={(e) => setCapture((c) => ({ ...c, email: e.target.value }))}
                      />
                    </label>
                    <label>
                      Phone <span className={styles.optional}>(optional)</span>
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={capture.phone}
                        onChange={(e) => setCapture((c) => ({ ...c, phone: e.target.value }))}
                      />
                    </label>
                    <label>
                      Business name <span className={styles.optional}>(optional)</span>
                      <input
                        autoComplete="organization"
                        value={capture.businessName}
                        onChange={(e) =>
                          setCapture((c) => ({ ...c, businessName: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Website <span className={styles.optional}>(optional)</span>
                      <input
                        autoComplete="url"
                        value={capture.website}
                        onChange={(e) => setCapture((c) => ({ ...c, website: e.target.value }))}
                      />
                    </label>
                    <button type="submit" disabled={busy}>
                      Send to DigitalGate
                    </button>
                  </>
                )}
              </form>
            ) : null}
          </div>

          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <label className={styles.srOnly} htmlFor={inputId}>
              Message Aida
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              rows={2}
              value={draft}
              disabled={busy || state === "rate_limited"}
              placeholder="Ask Aida…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button
              type="submit"
              className={styles.send}
              disabled={busy || state === "rate_limited" || !draft.trim()}
            >
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className={styles.launcher}
        onClick={() => void (open ? setOpen(false) : openPanel())}
        aria-label="Ask Aida — DigitalGate AI Business Advisor"
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AVATAR} alt="" width={44} height={44} className={styles.launcherImg} />
        <span className={styles.launcherLabel}>Ask Aida</span>
      </button>
    </div>
  );
}
