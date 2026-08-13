"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PropertyContractPanel({
  propertyId,
  contract,
}: {
  propertyId: string;
  contract?: {
    signedAt?: string;
    settlementDate?: string;
    purchasePriceCents?: number;
    buyerName?: string;
    specialConditions?: string;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [settlementDate, setSettlementDate] = useState(contract?.settlementDate?.slice(0, 10) ?? "");
  const [conditions, setConditions] = useState(contract?.specialConditions ?? "");

  async function saveContract(signed: boolean) {
    setPending(true);
    await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract: {
          signedAt: signed ? new Date().toISOString() : contract?.signedAt,
          settlementDate: settlementDate || undefined,
          purchasePriceCents: contract?.purchasePriceCents,
          buyerName: contract?.buyerName,
          specialConditions: conditions || undefined,
        },
      }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Contract</h2>
      {contract?.purchasePriceCents ? (
        <p className="mt-2 text-sm text-slate-300">
          Purchase price: ${(contract.purchasePriceCents / 100).toLocaleString("en-AU")}
          {contract.buyerName ? ` · ${contract.buyerName}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Accept an offer to pre-fill contract details.</p>
      )}

      <div className="mt-4 space-y-3 text-sm">
        <label className="block text-slate-400">
          Settlement date
          <input
            type="date"
            value={settlementDate}
            onChange={(e) => setSettlementDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-slate-400">
          Special conditions
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => saveContract(false)}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
        >
          Save contract
        </button>
        {!contract?.signedAt ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => saveContract(true)}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Mark contract signed
          </button>
        ) : (
          <span className="self-center text-xs text-emerald-400">
            Signed {new Date(contract.signedAt).toLocaleDateString("en-AU")}
          </span>
        )}
      </div>
    </div>
  );
}
