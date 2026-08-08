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
        <CreateLeadForm leadType="buyer" />
        <button
          type="button"
          onClick={syncFromWordPress}
          disabled={syncing}
          className="dg-btn dg-btn-primary"
        >
          {syncing ? "Syncing…" : "Sync buyers from WordPress"}
        </button>
        {syncMsg ? <p className="text-sm text-slate-400">{syncMsg}</p> : null}
      </div>

      {leads.length === 0 ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first buyer lead</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create a buyer enquiry here, or sync property enquiry forms from your WordPress site.
            Contacts are tagged as Buyer automatically.
          </p>
        </div>
      ) : (
        <div className="dg-table-scroll rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
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
                    <td className="max-w-[14rem] px-4 py-3">
                      <Link
                        href={`/apps/re/buyer-leads/${lead.id}`}
                        className="dg-break-anywhere font-medium text-white hover:text-blue-300"
                        prefetch
                      >
                        {lead.title ?? "Buyer lead"}
                      </Link>
                      {lead.propertyAddress ? (
                        <p className="dg-break-anywhere text-xs text-slate-500">
                          {lead.propertyAddress}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {stageLabel}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-400">
                      <span className="dg-break-anywhere line-clamp-3">
                        {lead.description ?? "—"}
                      </span>
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
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
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
        Buyer stages follow the agency WordPress enquiry pipeline. Prefer the kanban view under
        Buyer Leads for stage moves; Sync keeps Platform aligned with your site.
      </p>
    </div>
  );
}
