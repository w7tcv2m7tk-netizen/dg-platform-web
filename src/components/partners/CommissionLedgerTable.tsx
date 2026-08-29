"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CommissionLedgerRow, SerializedPartnerCommission } from "@dg/platform-core";

const STATUS_COLOR: Record<string, string> = {
  Generated: "bg-slate-700 text-slate-300",
  Pending: "bg-amber-900/40 text-amber-300",
  Approved: "bg-sky-900/40 text-sky-300",
  Payable: "bg-violet-900/40 text-violet-300",
  Paid: "bg-emerald-900/40 text-emerald-300",
};

export function CommissionLedgerTable({
  rows,
  commissions,
}: {
  rows: CommissionLedgerRow[];
  commissions: SerializedPartnerCommission[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center">
        <p className="text-sm text-slate-300">No commission entries yet.</p>
        <p className="mt-2 max-w-xl mx-auto text-sm text-slate-500">
          Commission entries will appear automatically as qualifying revenue is attributed to
          partner referrals or delivery activity.
        </p>
      </div>
    );
  }

  const statusById = new Map(commissions.map((c) => [c.id, c.status]));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {rows.map((row) => {
              const rawStatus = statusById.get(row.id) ?? row.status;
              const isExpanded = expanded === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/command/partners/${row.partnerId}`}
                        className="font-medium text-white hover:text-sky-300"
                      >
                        {row.partnerName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{row.typeLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.customerLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.revenueLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.rateLabel}</td>
                    <td className="px-4 py-3 text-slate-400">{row.periodLabel}</td>
                    <td className="px-4 py-3 font-semibold text-white">{row.commissionLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[row.statusLabel] ?? "bg-slate-700 text-slate-300"}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : row.id)}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        {isExpanded ? "Hide" : "Audit"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr key={`${row.id}-audit`} className="bg-slate-900/50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <ul className="space-y-1 text-xs text-slate-400">
                            {row.auditLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-1">
                            {rawStatus === "CALCULATED" && (
                              <ActionBtn
                                label="Mark Pending"
                                onClick={() => void updateStatus(row.id, "PENDING")}
                                disabled={saving === row.id}
                              />
                            )}
                            {rawStatus === "PENDING" && (
                              <ActionBtn
                                label="Approve"
                                onClick={() => void updateStatus(row.id, "APPROVED")}
                                disabled={saving === row.id}
                              />
                            )}
                            {rawStatus === "APPROVED" && (
                              <>
                                <ActionBtn
                                  label="Mark Payable"
                                  onClick={() => void updateStatus(row.id, "payable")}
                                  disabled={saving === row.id}
                                />
                                <ActionBtn
                                  label="Mark Paid"
                                  onClick={() => void updateStatus(row.id, "PAID")}
                                  disabled={saving === row.id}
                                  highlight
                                />
                              </>
                            )}
                            {rawStatus === "payable" && (
                              <ActionBtn
                                label="Mark Paid"
                                onClick={() => void updateStatus(row.id, "PAID")}
                                disabled={saving === row.id}
                                highlight
                              />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
        highlight
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
