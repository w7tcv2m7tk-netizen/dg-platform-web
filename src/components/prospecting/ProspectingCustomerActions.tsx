"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProspectPipelineStage } from "@dg/platform-core";

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  audit_created: "Audit created",
  report_sent: "Report sent",
  email_opened: "Email opened",
  report_viewed: "Report viewed",
  follow_up_due: "Follow-up due",
  meeting_booked: "Meeting booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  onboarding: "Onboarding",
};

function safeError(fallback: string) {
  return fallback;
}

export function ProspectAuditButton({
  prospectId,
  label = "Enrich",
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
      const res = await fetch(`/api/v1/prospecting/prospects/${prospectId}/audit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("audit_failed");
      router.refresh();
    } catch {
      setError(safeError("Could not enrich this prospect. Try again."));
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
        className="rounded-md border border-sky-700/60 px-2 py-1 text-[11px] text-sky-300 hover:border-sky-500 disabled:opacity-50"
      >
        {pending ? "Enriching…" : label}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function ProspectStageControl({
  prospectId,
  stage,
  stages,
}: {
  prospectId: string;
  stage: string;
  stages: ProspectPipelineStage[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/prospecting/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      if (!res.ok) throw new Error("stage_failed");
      router.refresh();
    } catch {
      setError("Could not update stage.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        value={stage}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
      >
        {stages.map((item) => (
          <option key={item} value={item}>
            {STAGE_LABELS[item] ?? item}
          </option>
        ))}
      </select>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

type ProspectEditFields = {
  id: string;
  businessName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  industry?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
};

export function ProspectEditControl({ prospect }: { prospect: ProspectEditFields }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/v1/prospecting/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: data.get("businessName"),
          contactName: String(data.get("contactName") ?? ""),
          contactEmail: String(data.get("contactEmail") ?? ""),
          contactPhone: String(data.get("contactPhone") ?? ""),
          industry: String(data.get("industry") ?? ""),
          location: String(data.get("location") ?? ""),
          websiteUrl: String(data.get("websiteUrl") ?? ""),
        }),
      });
      if (!res.ok) throw new Error("edit_failed");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not update this prospect. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="mt-2 w-full basis-full rounded-lg border border-sky-500/30 bg-slate-950/90 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-sky-300">Edit prospect</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-2">
        <input
          name="businessName"
          required
          defaultValue={prospect.businessName}
          aria-label="Business name"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="industry" defaultValue={prospect.industry ?? ""} placeholder="Industry" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
          <input name="location" defaultValue={prospect.location ?? ""} placeholder="Location" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
          <input name="contactName" defaultValue={prospect.contactName ?? ""} placeholder="Contact name" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
          <input name="contactEmail" type="email" defaultValue={prospect.contactEmail ?? ""} placeholder="Contact email" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
          <input name="contactPhone" defaultValue={prospect.contactPhone ?? ""} placeholder="Phone" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
          <input name="websiteUrl" defaultValue={prospect.websiteUrl ?? ""} placeholder="Website" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
        </div>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export function ProspectArchiveControl({
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
    const confirmed = archived
      ? window.confirm(`Restore ${label} to the active pipeline?`)
      : window.confirm(`Archive ${label}? Existing audit and CRM records will remain on file.`);
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/prospecting/prospects/${prospectId}`, {
        method: archived ? "POST" : "DELETE",
        headers: archived ? { "Content-Type": "application/json" } : undefined,
        body: archived ? JSON.stringify({ action: "restore" }) : undefined,
      });
      if (!res.ok) throw new Error("archive_failed");
      router.refresh();
    } catch {
      setError(archived ? "Could not restore this prospect." : "Could not archive this prospect.");
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
        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500 disabled:opacity-50"
      >
        {pending ? (archived ? "Restoring…" : "Archiving…") : archived ? "Restore" : "Archive"}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}

export function ProspectConvertToCrmButton({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm("Convert this qualified prospect into CRM Company, Contact and Opportunity records?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/prospecting/prospects/${prospectId}/convert-to-crm`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error("conversion_failed");
      const id = typeof json?.data?.opportunityId === "string" ? json.data.opportunityId : null;
      setOpportunityId(id);
      router.refresh();
    } catch {
      setError("Could not convert this prospect to CRM. Check your CRM access and try again.");
    } finally {
      setPending(false);
    }
  }

  if (opportunityId) {
    return (
      <Link href={`/apps/crm/opportunities/${opportunityId}`} className="text-[11px] font-medium text-emerald-300 hover:underline">
        Open CRM opportunity →
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onClick()}
        className="rounded-md border border-emerald-600/60 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:border-emerald-400 disabled:opacity-50"
      >
        {pending ? "Converting…" : "Convert to CRM"}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </div>
  );
}
