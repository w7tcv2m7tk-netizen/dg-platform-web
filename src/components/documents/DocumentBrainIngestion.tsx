"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = {
  state: "not_started" | "processing" | "completed" | "failed";
  proposedCount: number;
  message?: string;
  updatedAt?: string;
};

export function DocumentBrainIngestion({
  documentId,
  mimeType,
}: {
  documentId: string;
  mimeType: string;
}) {
  const [status, setStatus] = useState<Status>({ state: "not_started", proposedCount: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/documents/${encodeURIComponent(documentId)}/knowledge`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active && json.data) setStatus(json.data as Status);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [documentId]);

  async function ingest() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/documents/${encodeURIComponent(documentId)}/knowledge`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          state: "failed",
          proposedCount: 0,
          message: json.error?.message || "Knowledge extraction failed",
        });
        return;
      }
      setStatus(json.data as Status);
    } finally {
      setBusy(false);
    }
  }

  const pdf = mimeType === "application/pdf";

  return (
    <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
      <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Business Brain</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Propose knowledge from this document</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        DigitalGate can read a text-based PDF and extract durable business facts, policies,
        processes, goals and operating rules. Extracted items go to the Knowledge Inbox as
        <strong className="font-medium text-slate-300"> proposals only</strong> — Aida will not use
        them until an authorised person approves them.
      </p>

      {!pdf ? (
        <p className="mt-3 text-sm text-amber-300">
          This file is not a text PDF. Image-only documents are deliberately not treated as
          readable knowledge yet.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void ingest()}
          disabled={!pdf || busy || status.state === "processing"}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy || status.state === "processing"
            ? "Extracting…"
            : status.state === "completed"
              ? "Check knowledge proposals"
              : "Extract for Business Brain"}
        </button>
        {status.state === "completed" ? (
          <Link href="/dashboard/brain" className="text-sm text-sky-400 hover:underline">
            Open Knowledge Inbox →
          </Link>
        ) : null}
      </div>

      {status.state !== "not_started" ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-3 text-sm ${
            status.state === "completed"
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
              : status.state === "failed"
                ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
                : "border-slate-700 bg-slate-950/40 text-slate-300"
          }`}
          role="status"
        >
          <p>{status.message || status.state.replace(/_/g, " ")}</p>
          {status.state === "completed" && status.proposedCount > 0 ? (
            <p className="mt-1 text-xs opacity-80">
              {status.proposedCount} proposal{status.proposedCount === 1 ? "" : "s"} linked to this
              document version with source provenance.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
