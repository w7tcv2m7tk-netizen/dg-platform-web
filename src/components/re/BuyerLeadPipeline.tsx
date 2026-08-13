"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreateLeadForm } from "@/components/re/CreateLeadForm";

const STAGES = [
  { id: "inquiry", label: "Inquiry" },
  { id: "qualified", label: "Qualified" },
  { id: "viewing", label: "Viewing" },
  { id: "offer", label: "Offer" },
  { id: "purchased", label: "Purchased" },
] as const;

export function BuyerLeadPipeline({
  leads,
}: {
  leads: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    status: string;
    stage: string;
    propertyAddress?: string;
    metadata?: Record<string, unknown>;
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
      body: JSON.stringify({ action: "sync_wordpress_buyers" }),
    });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(json?.error?.message ?? "Sync failed");
      return;
    }
    setSyncMsg(
      `Synced: ${json.data.created} new, ${json.data.updated} updated, ${json.data.skipped} unchanged`,
    );
    router.refresh();
  }

  async function moveStage(leadId: string, stage: string) {
    setPending(leadId);
    await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stage, leadType: "buyer" }),
    });
    setPending(null);
    router.refresh();
  }

  const byStage = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => (l.stage || "inquiry") === stage.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <CreateLeadForm leadType="buyer" />
        <button
          type="button"
          onClick={syncFromWordPress}
          disabled={syncing}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync buyers from WordPress"}
        </button>
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
      </div>

      {leads.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first buyer lead</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Create a buyer enquiry here, or sync property enquiry forms from your WordPress site.
            Contacts are tagged as Buyer automatically.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Tip: use <span className="text-slate-400">Add buyer lead</span> above, or Sync buyers
            from WordPress when the connector is live.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {byStage.map((column) => (
            <div
              key={column.id}
              className="min-w-[220px] flex-shrink-0 rounded-xl border border-slate-800 bg-slate-950/50 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{column.label}</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {column.leads.length}
                </span>
              </div>
              <ul className="space-y-2">
                {column.leads.map((lead) => {
                  const propertyUrl = lead.metadata?.property_url as string | undefined;
                  return (
                    <li
                      key={lead.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <Link
                        href={`/apps/re/buyer-leads/${lead.id}`}
                        className="font-medium text-white hover:underline"
                      >
                        {lead.title ?? "Buyer lead"}
                      </Link>
                      {lead.propertyAddress ? (
                        <p className="mt-1 text-xs text-slate-500">{lead.propertyAddress}</p>
                      ) : null}
                      {lead.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                          {lead.description}
                        </p>
                      ) : null}
                      {propertyUrl ? (
                        <a
                          href={propertyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-blue-400 hover:underline"
                        >
                          Listing ↗
                        </a>
                      ) : null}
                      <select
                        className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                        value={lead.stage || "inquiry"}
                        disabled={pending === lead.id}
                        onChange={(e) => moveStage(lead.id, e.target.value)}
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            → {s.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
