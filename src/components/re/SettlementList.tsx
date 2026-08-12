"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SettlementChecklist } from "@dg/platform-core";
import { PROPERTY_STATUS_LABELS } from "@dg/platform-core/properties/statuses";

const CHECKLIST_ITEMS = [
  { id: "contract_signed", label: "Contract signed" },
  { id: "finance_approved", label: "Finance approved" },
  { id: "building_pest", label: "Building & pest complete" },
  { id: "settlement_booked", label: "Settlement date booked" },
  { id: "keys_handover", label: "Keys handed over" },
  { id: "past_client_followup", label: "Past client follow-up" },
] as const;

export function SettlementList({
  items,
}: {
  items: Array<{
    id: string;
    address: string;
    status: string;
    leadId?: string | null;
    leadTitle?: string | null;
    leadStage?: string | null;
    listingPriceCents?: number | null;
    checklist: SettlementChecklist;
    progress: { done: number; total: number; percent: number };
    updatedAt: string;
  }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function completePastClient(leadId: string) {
    setPending(leadId);
    await fetch("/api/v1/re/past-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorLeadId: leadId }),
    });
    setPending(null);
    router.refresh();
  }

  async function toggleItem(propertyId: string, checklist: SettlementChecklist, itemId: string) {
    const next = { ...checklist, [itemId]: !checklist[itemId as keyof SettlementChecklist] };
    setPending(propertyId);
    await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlement_checklist: next }),
    });
    setPending(null);
    router.refresh();
  }

  if (!items.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <h2 className="text-lg font-semibold text-white">No settlements yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          When a listing goes under offer, contract signed, unconditional, or sold — or a vendor
          lead reaches settlement — it appears here with the settlement checklist.
        </p>
        <Link
          href="/apps/re/vendor-leads"
          className="mt-4 inline-block text-sm text-blue-400 hover:underline"
        >
          Start from a vendor lead →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-6">
      {items.map((item) => (
        <li key={item.id} className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={`/apps/re/properties/${item.id}`}
                className="text-lg font-semibold text-white hover:underline"
              >
                {item.address}
              </Link>
              <p className="mt-1 text-sm text-slate-400">
                {PROPERTY_STATUS_LABELS[
                  item.status as keyof typeof PROPERTY_STATUS_LABELS
                ] ?? item.status.replace(/_/g, " ")}
                {item.leadStage ? ` · Lead: ${item.leadStage.replace(/_/g, " ")}` : ""}
              </p>
              {item.leadId ? (
                <Link
                  href={`/apps/re/vendor-leads/${item.leadId}`}
                  className="mt-1 inline-block text-sm text-blue-400 hover:underline"
                >
                  {item.leadTitle ?? "Vendor lead"} →
                </Link>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-slate-500">Checklist</p>
              <p className="text-2xl font-bold text-white">{item.progress.percent}%</p>
              <p className="text-xs text-slate-500">
                {item.progress.done}/{item.progress.total} complete
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {CHECKLIST_ITEMS.map((check) => (
              <li key={check.id}>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(item.checklist[check.id])}
                    disabled={pending === item.id}
                    onChange={() => toggleItem(item.id, item.checklist, check.id)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  {check.label}
                </label>
              </li>
            ))}
          </ul>

          {item.leadId &&
          item.progress.percent >= 100 &&
          item.leadStage !== "past_client" ? (
            <button
              type="button"
              disabled={pending === item.leadId}
              onClick={() => completePastClient(item.leadId!)}
              className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending === item.leadId ? "Processing…" : "Mark past client & request review →"}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
