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
  canCreate = false,
  canEdit = false,
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
  canCreate?: boolean;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function moveStage(leadId: string, stage: string) {
    if (!canEdit) return;
    setPending(leadId);
    const res = await fetch("/api/v1/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, stage }),
    });
    setPending(null);
    if (res.ok) router.refresh();
  }

  const byStage = STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => (l.stage || "vendor_lead") === stage.id),
  }));

  return (
    <div className="space-y-6">
      {canCreate ? (
        <div className="flex flex-wrap items-center gap-3">
          <CreateLeadForm leadType="vendor" />
        </div>
      ) : null}

      {!leads.length ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">No vendor leads yet</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            {canCreate
              ? "Capture a vendor enquiry here, then move it through appraisal, listing, sale and settlement."
              : "Vendor enquiries will appear here when they are captured in the platform."}
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
                    className="flex min-h-11 flex-col justify-center hover:opacity-90"
                  >
                    <p className="font-medium text-white">{lead.title ?? "Untitled"}</p>
                    <p className="text-slate-500">{lead.source}</p>
                  </Link>
                  {canEdit ? (
                    <select
                      className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-slate-300"
                      value={lead.stage || "vendor_lead"}
                      disabled={pending === lead.id}
                      onChange={(e) => void moveStage(lead.id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
