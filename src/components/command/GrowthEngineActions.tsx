"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunProspectAuditButton({
  prospectId,
  label = "Run audit",
}: {
  prospectId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/growth/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Audit failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onClick()}
        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? "Probing…" : label}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function GenerateProspectReportButton({
  prospectId,
  auditId,
  markSent = false,
  label,
}: {
  prospectId: string;
  auditId?: string;
  markSent?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/growth/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, auditId, markSent }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not generate report");
      }
      router.push("/command/growth-engine/reports");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onClick()}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500/50 hover:text-white disabled:opacity-50"
      >
        {pending ? "Generating…" : label ?? (markSent ? "Generate & mark sent" : "Generate report")}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function MarkReportSentButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await fetch("/api/v1/command/growth/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_sent", reportId }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onClick()}
      className="text-xs text-sky-400 hover:underline disabled:opacity-50"
    >
      {pending ? "Saving…" : "Mark sent"}
    </button>
  );
}
