"use client";

import Link from "next/link";
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

export function CopyShareLinkButton({ sharePath }: { sharePath: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500/50 hover:text-white"
    >
      {copied ? "Copied" : "Copy share link"}
    </button>
  );
}

export function CreateProposalQuoteButton({
  prospectId,
  label = "Create Commerce quote",
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
      const res = await fetch("/api/v1/command/growth/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not create quote");
      }
      const quoteId = json?.data?.quoteId as string | undefined;
      if (quoteId) {
        router.push(`/apps/commerce/quotes/${quoteId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
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
        {pending ? "Creating…" : label}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

/** Create or finish linking a platform Organisation after a won Growth deal. */
export function ConvertProspectToOrgButton({
  prospectId,
  label = "Create client org",
  convertedOrganisationId,
}: {
  prospectId: string;
  label?: string;
  convertedOrganisationId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (convertedOrganisationId) {
    return (
      <Link
        href="/command/clients"
        className="text-xs text-emerald-400 hover:underline"
      >
        Org linked →
      </Link>
    );
  }

  async function onClick() {
    if (
      !window.confirm(
        "Create a client organisation from this prospect? Name, website, and contact details carry over. No billing is created.",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/command/growth/prospects/${prospectId}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not create client org");
      }
      router.push("/command/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
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
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {pending ? "Creating…" : label}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}
