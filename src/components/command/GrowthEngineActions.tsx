"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

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
  const [copied, setCopied] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    setCopied(false);
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
      const sharePath = json?.data?.sharePath as string | undefined;
      if (sharePath) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const ok = await copyText(`${origin}${sharePath}`);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2500);
        }
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
        {pending
          ? "Generating…"
          : copied
            ? "Link copied"
            : (label ?? (markSent ? "Generate & mark sent" : "Generate report"))}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function MarkReportSentButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/growth/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_sent", reportId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Could not mark sent");
      }
      setDone(true);
      const sharePath = json?.data?.sharePath as string | undefined;
      if (sharePath) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        await copyText(`${origin}${sharePath}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mark sent failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || done}
        onClick={() => void onClick()}
        className="text-xs text-sky-400 hover:underline disabled:opacity-50"
      >
        {pending ? "Saving…" : done ? "Marked sent" : "Mark sent"}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function CopyShareLinkButton({ sharePath }: { sharePath: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${sharePath}`;
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setError("Copy failed — select the link manually");
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500/50 hover:text-white"
      >
        {copied ? "Copied" : "Copy share link"}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
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

/** Soft-archive (or restore) a Growth prospect for Command Centre demo cleanup. */
export function ArchiveProspectButton({
  prospectId,
  businessName,
  archived = false,
}: {
  prospectId: string;
  businessName?: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const label = businessName?.trim() || "this prospect";
    if (archived) {
      if (!window.confirm(`Restore ${label} to the active pipeline?`)) return;
    } else if (
      !window.confirm(
        `Archive ${label}? They will leave Pipeline and Discovery. Audits and reports stay on file; public opportunity links become unavailable. Quotes/invoices are unchanged.`,
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/command/growth/prospects/${prospectId}`, {
        method: archived ? "POST" : "DELETE",
        headers: archived ? { "Content-Type": "application/json" } : undefined,
        body: archived ? JSON.stringify({ action: "restore" }) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json?.error?.message ?? (archived ? "Could not restore" : "Could not archive"),
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
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
        className={
          archived
            ? "rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-200 hover:border-sky-400/60 disabled:opacity-50"
            : "rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-rose-500/40 hover:text-rose-200 disabled:opacity-50"
        }
      >
        {pending ? (archived ? "Restoring…" : "Archiving…") : archived ? "Restore" : "Archive"}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

type TransitionNextSteps = {
  clientsHref: string;
  teamHref: string;
  billingHref: string;
  connectorsHref: string;
  switchHint: string;
};

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
  const [invitePending, setInvitePending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    organisationId: string;
    organisationName: string;
    contactEmail: string | null;
    nextSteps: TransitionNextSteps;
  } | null>(null);

  if (convertedOrganisationId && !result) {
    return (
      <Link
        href="/command/clients"
        className="text-xs text-emerald-400 hover:underline"
      >
        Org linked →
      </Link>
    );
  }

  async function inviteOwner(email: string) {
    setInvitePending(true);
    setInviteMessage(null);
    setError(null);
    try {
      // Switch into the new client org first so team invite targets it.
      const switchRes = await fetch("/api/v1/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId: result!.organisationId }),
      });
      const switchJson = await switchRes.json().catch(() => null);
      if (!switchRes.ok) {
        throw new Error(
          switchJson?.error?.message ??
            "Could not switch into client org — use org switcher, then Team → invite",
        );
      }
      const inviteRes = await fetch("/api/v1/org/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "admin" }),
      });
      const inviteJson = await inviteRes.json().catch(() => null);
      if (!inviteRes.ok) {
        throw new Error(inviteJson?.error?.message ?? "Invite failed");
      }
      setInviteMessage(`Invite sent to ${email} (owner/admin). Open Billing next.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInvitePending(false);
    }
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
      const data = json?.data;
      setResult({
        organisationId: data.organisationId as string,
        organisationName: (data.organisationName as string) || "Client org",
        contactEmail: (data.contactEmail as string | null) ?? null,
        nextSteps: data.nextSteps as TransitionNextSteps,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const { nextSteps, contactEmail, organisationName } = result;
    return (
      <div className="w-full max-w-sm rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-left">
        <p className="text-xs font-medium text-emerald-200">
          Org created · {organisationName}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          {nextSteps.switchHint}
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>
            <Link href={nextSteps.clientsHref} className="text-sky-400 hover:underline">
              Clients list →
            </Link>
          </li>
          <li>
            <Link href={nextSteps.teamHref} className="text-sky-400 hover:underline">
              Team / invite owner →
            </Link>
          </li>
          <li>
            <Link href={nextSteps.billingHref} className="text-sky-400 hover:underline">
              Billing (Stripe checkout) →
            </Link>
          </li>
          <li>
            <Link href={nextSteps.connectorsHref} className="text-sky-400 hover:underline">
              Connectors →
            </Link>
          </li>
        </ul>
        {contactEmail ? (
          <button
            type="button"
            disabled={invitePending}
            onClick={() => void inviteOwner(contactEmail)}
            className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {invitePending ? "Inviting…" : `Invite ${contactEmail}`}
          </button>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">
            No contact email on prospect — invite from Team after switching org.
          </p>
        )}
        {inviteMessage ? (
          <p className="mt-2 text-[11px] text-emerald-300">{inviteMessage}</p>
        ) : null}
        {error ? <p className="mt-2 text-[11px] text-rose-300">{error}</p> : null}
      </div>
    );
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
