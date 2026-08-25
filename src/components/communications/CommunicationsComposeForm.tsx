"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommunicationsComposeForm({
  defaultTo = "",
  defaultSubject = "",
  contactId,
  opportunityId,
  companyId,
  contactName,
}: {
  defaultTo?: string;
  defaultSubject?: string;
  contactId?: string;
  opportunityId?: string;
  companyId?: string;
  contactName?: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sendLater, setSendLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOk(null);

    const payload: Record<string, unknown> = {
      channel: "email",
      to: to.trim(),
      subject: subject.trim() || undefined,
      body: body.trim(),
      contactId: contactId || undefined,
      metadata: {
        source: "manual",
        whySent: contactName
          ? `Manual email to ${contactName} from Communications`
          : "Manual email from Communications",
        opportunityId: opportunityId || undefined,
        companyId: companyId || undefined,
      },
    };

    if (sendLater) {
      if (!scheduledAt.trim()) {
        setPending(false);
        setError("Pick a date and time to send later.");
        return;
      }
      payload.scheduledAt = new Date(scheduledAt).toISOString();
    }

    const res = await fetch("/api/v1/communications/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json?.error?.message ?? `Send failed (${res.status})`);
      return;
    }
    const status = json?.data?.status as string | undefined;
    if (status === "scheduled") {
      setOk("Email scheduled. It appears under Scheduled until send time.");
      setBody("");
      router.push("/apps/communications/scheduled");
      router.refresh();
      return;
    }
    setOk(
      status === "sent"
        ? "Email sent. It appears in Sent and History."
        : status === "queued"
          ? "Email queued (delivery provider not configured or deferred)."
          : "Email recorded.",
    );
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      {contactName ? (
        <p className="text-sm text-slate-400">
          Context: <span className="text-slate-200">{contactName}</span>
          {contactId ? " · linked to CRM contact" : null}
        </p>
      ) : null}
      <label className="block space-y-1">
        <span className="text-xs text-slate-500">To</span>
        <input
          type="email"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-500">Subject</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-500">Message</span>
        <textarea
          required
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Write the email…"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={sendLater}
          onChange={(e) => setSendLater(e.target.checked)}
          className="rounded border-slate-600"
        />
        Send later
      </label>
      {sendLater ? (
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">Send at</span>
          <input
            type="datetime-local"
            required={sendLater}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-400">{ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Working…" : sendLater ? "Schedule email" : "Send email"}
      </button>
      <p className="text-xs text-slate-500">
        Sent via DigitalGate (Resend). Google / Microsoft mailbox send comes next — they remain
        the authoritative mailbox.
      </p>
    </form>
  );
}
