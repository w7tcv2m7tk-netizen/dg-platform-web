"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreateLeadForm } from "@/components/re/CreateLeadForm";

const STAGES = [
  { id: "vendor_lead", label: "Vendor Lead" },
  { id: "appraisal", label: "Appraisal" },
  { id: "listing", label: "Listing" },
  { id: "sale", label: "Sale" },
  { id: "settlement", label: "Settlement" },
  { id: "past_client", label: "Past Client" },
] as const;

export function VendorLeadPipeline({
  leads,
}: {
  leads: Array<{
    id: string;
    title?: string | null;
    status: string;
    source: string;
    stage: string;
    propertyAddress?: string;
    createdAt: string;
  }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncFromWordPress() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_wordpress" }),
    });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(json?.error?.message ?? "Sync failed");
      return;
    }
    setSyncMsg(
      `Synced: ${json.data.created} new, ${json.data.skipped} already imported`,
    );
    router.refresh();
  }

  async function moveStage(leadId: string, stage: string) {
    setPending(leadId);
    await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stage }),
    });
    setPending(null);
    router.refresh();
  }

  const byStage = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => (l.stage || "vendor_lead") === stage.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <CreateLeadForm leadType="vendor" />
        <button
          type="button"
          onClick={syncFromWordPress}
          disabled={syncing}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync from WordPress"}
        </button>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch("/api/v1/connectors/wordpress/status");
            const json = await res.json().catch(() => null);
            const p = json?.data?.probe;
            const env = json?.data?.env;
            if (p?.ok) {
              setSyncMsg(
                `Connector OK — ${p.leadCount} lead(s) available at ${json?.data?.connectorBaseUrl}`,
              );
            } else {
              setSyncMsg(
                `[${env?.usingKey ?? "?"}] ${p?.message ?? "Diagnostic failed"}`,
              );
            }
          }}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Test connection
        </button>
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
        <p className="text-xs text-slate-500">
          Auto-sync runs every 4 hours when you open this page
        </p>
      </div>

      {!leads.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first vendor lead</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Capture a vendor enquiry here, or sync property reports from WordPress. Next step:
            start an appraisal and move the lead through listing → offer → settlement.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Tip: use <span className="text-slate-400">Add vendor lead</span> above — contact is
            tagged as Vendor automatically.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {byStage.map((column) => (
          <div key={column.id} className="dg-card min-h-48">
            <h3 className="text-sm font-semibold text-white">{column.label}</h3>
            <p className="text-xs text-slate-500">{column.leads.length} leads</p>
            <ul className="mt-3 space-y-2">
              {column.leads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs"
                >
                  <Link
                    href={`/apps/re/vendor-leads/${lead.id}`}
                    className="block hover:opacity-90"
                  >
                    <p className="font-medium text-white">
                      {lead.title ?? "Untitled"}
                    </p>
                    <p className="text-slate-500">{lead.source}</p>
                  </Link>
                  <select
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-1 py-1 text-slate-300"
                    value={lead.stage || "vendor_lead"}
                    disabled={pending === lead.id}
                    onChange={(e) => moveStage(lead.id, e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
