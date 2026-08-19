"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedPartnerCommission } from "@dg/platform-core";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

const STATUS_COLOR: Record<string, string> = {
  CALCULATED: "bg-slate-700 text-slate-300",
  PENDING: "bg-amber-900/40 text-amber-300",
  APPROVED: "bg-sky-900/40 text-sky-300",
  PAID: "bg-emerald-900/40 text-emerald-300",
};

export function CommissionAdminTable({
  commissions,
}: {
  commissions: SerializedPartnerCommission[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setSaving(id);
    await fetch(`/api/v1/admin/commissions/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    router.refresh();
  }

  if (commissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
        No commission entries yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Commission</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {commissions.map((c) => (
            <tr key={c.id} className="hover:bg-slate-700/20">
              <td className="px-4 py-3 font-medium text-white">{c.businessName ?? "—"}</td>
              <td className="px-4 py-3 text-slate-400">
                {c.periodStart
                  ? new Date(c.periodStart).toLocaleDateString("en-AU")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {centsToDisplay(c.qualifyingRevenueCents)}
              </td>
              <td className="px-4 py-3 text-slate-300">{c.commissionPercent}%</td>
              <td className="px-4 py-3 font-semibold text-white">
                {centsToDisplay(c.commissionAmountCents)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-slate-700 text-slate-300"}`}
                >
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {c.status === "CALCULATED" && (
                    <ActionBtn
                      label="Mark Pending"
                      onClick={() => void updateStatus(c.id, "PENDING")}
                      disabled={saving === c.id}
                    />
                  )}
                  {c.status === "PENDING" && (
                    <ActionBtn
                      label="Approve"
                      onClick={() => void updateStatus(c.id, "APPROVED")}
                      disabled={saving === c.id}
                    />
                  )}
                  {c.status === "APPROVED" && (
                    <ActionBtn
                      label="Mark Paid"
                      onClick={() => void updateStatus(c.id, "PAID")}
                      disabled={saving === c.id}
                      highlight
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  highlight,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
        highlight
          ? "bg-emerald-700 text-white hover:bg-emerald-600"
          : "border border-slate-600 text-slate-300 hover:border-sky-400 hover:text-sky-300"
      }`}
    >
      {label}
    </button>
  );
}
