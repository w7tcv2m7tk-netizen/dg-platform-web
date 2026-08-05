"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = [
  { id: "inquiry", label: "Inquiry" },
  { id: "qualified", label: "Qualified" },
  { id: "viewing", label: "Viewing" },
  { id: "offer", label: "Offer" },
  { id: "purchased", label: "Purchased" },
] as const;

export function BuyerLeadList({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
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
          <p className="text-slate-300">No buyer leads in Postgres yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Sync from Roe WordPress — property enquiry forms create buyer pipeline records.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Requirements</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leads.map((lead) => {
                const stage = lead.stage || "inquiry";
                const stageLabel =
                  STAGES.find((s) => s.id === stage)?.label ?? stage;
                const propertyUrl = lead.metadata?.property_url as string | undefined;

                return (
                  <tr key={lead.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{lead.title ?? "Buyer lead"}</p>
                      {lead.propertyAddress ? (
                        <p className="text-xs text-slate-500">{lead.propertyAddress}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {stageLabel}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-400">
                      {lead.description ?? "—"}
                      {propertyUrl ? (
                        <>
                          {" "}
                          <a
                            href={propertyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            Listing ↗
                          </a>
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString("en-AU")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Buyer stages match Roe WordPress pipeline. Stage editing on Gen 2 ships next — sync keeps
        Postgres up to date with wp-admin.
      </p>
    </div>
  );
}
