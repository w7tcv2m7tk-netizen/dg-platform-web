"use client";

import Link from "next/link";
import { useState } from "react";

type IngestionState = "not_ingested" | "proposed" | "approved" | "reviewed";

type IngestionStatus = {
  state: IngestionState;
  proposalCount: number;
  approvedCount: number;
  rejectedCount: number;
};

function stateCopy(status: IngestionStatus) {
  if (status.state === "approved") {
    return `${status.approvedCount} approved Business Brain fact${status.approvedCount === 1 ? "" : "s"} from this document version.`;
  }
  if (status.state === "proposed") {
    return `${status.proposalCount} candidate${status.proposalCount === 1 ? "" : "s"} awaiting human review in the Business Brain inbox.`;
  }
  if (status.state === "reviewed") {
    return "This document version has been reviewed. No pending proposals remain.";
  }
  return "This document version has not been proposed to the Business Brain yet.";
}

export function DocumentKnowledgeIngestion(props: {
  documentId: string;
  mimeType: string;
  initialStatus: IngestionStatus;
}) {
  const [status, setStatus] = useState(props.initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = props.mimeType === "application/pdf";
  const alreadyProcessed = status.state !== "not_ingested";

  async function ingest() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/v1/documents/${encodeURIComponent(props.documentId)}/knowledge`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Could not propose document knowledge.");
      }
      const result = payload?.data?.result;
      if (result) {
        setStatus({
          state: result.state,
          proposalCount: result.proposalCount ?? 0,
          approvedCount: result.approvedCount ?? 0,
          rejectedCount: result.rejectedCount ?? 0,
        });
        setMessage(result.message || "Knowledge candidates sent for review.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not propose document knowledge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Business Brain</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Propose knowledge from this document</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            DigitalGate extracts candidate facts and sends them to the governed Knowledge Inbox. Nothing in this document teaches the Business Brain until a person reviews and approves it.
          </p>
        </div>
        <Link href="/dashboard/brain" className="text-sm font-medium text-sky-300 hover:underline">
          Open Business Brain →
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <p className="text-sm text-slate-300">{stateCopy(status)}</p>
        {!supported ? (
          <p className="mt-2 text-xs text-amber-300">
            Image files need OCR before DigitalGate can extract reliable text. They are not silently interpreted.
          </p>
        ) : null}
        {message ? <p className="mt-2 text-xs text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

        <button
          type="button"
          onClick={ingest}
          disabled={busy || alreadyProcessed || !supported}
          className="mt-4 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Extracting…"
            : alreadyProcessed
              ? "Already sent for review"
              : supported
                ? "Propose knowledge"
                : "OCR required"}
        </button>
      </div>
    </section>
  );
}
