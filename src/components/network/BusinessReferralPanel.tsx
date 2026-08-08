"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Referral = {
  id: string;
  type: string;
  status: string;
  recipientBusiness: string;
  feeDisclosure?: string | null;
  disclosed: boolean;
  createdAt: string;
};

const TYPES = [
  { value: "free", label: "Free" },
  { value: "reciprocal", label: "Reciprocal" },
  { value: "paid", label: "Paid" },
  { value: "commission", label: "Commission" },
] as const;

export function BusinessReferralPanel({
  contactId,
  industry,
  referrals,
  complianceNote,
}: {
  contactId: string;
  industry?: string | null;
  referrals: Referral[];
  complianceNote: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("free");
  const [recipientBusiness, setRecipient] = useState("");
  const [feeDisclosure, setFee] = useState("");
  const [disclosed, setDisclosed] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createReferral(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/network/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          contactId,
          type,
          recipientBusiness,
          feeDisclosure: feeDisclosure || undefined,
          disclosed,
          notes: notes || undefined,
          industry,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not create referral");
        return;
      }
      setRecipient("");
      setFee("");
      setNotes("");
      setDisclosed(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function advance(referralId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/network/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance", referralId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not advance referral");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  const needsDisclosure = type === "paid" || type === "commission";

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Business referral</h2>
      <p className="mt-1 text-xs text-slate-500">
        B2B network introduction on this Contact (person) — not Platform Refer &amp; Earn
      </p>

      <form onSubmit={createReferral} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-slate-400">Recipient business</span>
          <input
            required
            value={recipientBusiness}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="e.g. Coastal Conveyancing"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Referral type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {needsDisclosure ? (
          <>
            <label className="block text-sm">
              <span className="text-slate-400">Fee disclosure (required)</span>
              <input
                required
                value={feeDisclosure}
                onChange={(e) => setFee(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                placeholder="e.g. $150 fixed / 10% of invoice"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={disclosed}
                onChange={(e) => setDisclosed(e.target.checked)}
                className="mt-1"
              />
              <span>All parties acknowledge this fee type (invisible commissions are not allowed)</span>
            </label>
          </>
        ) : null}
        <label className="block text-sm">
          <span className="text-slate-400">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create referral"}
        </button>
      </form>

      {(needsDisclosure || industry) && (
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
          {complianceNote}
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-6 border-t border-slate-800 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Funnel · Referral → Accepted → Contacted → Converted → Revenue
        </p>
        {!referrals.length ? (
          <p className="mt-3 text-sm text-slate-400">No business referrals on this Contact yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">{r.recipientBusiness}</p>
                  <p className="text-xs text-slate-500">
                    {r.type} · {r.status}
                    {r.feeDisclosure ? ` · ${r.feeDisclosure}` : ""}
                  </p>
                </div>
                {r.status !== "revenue" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => advance(r.id)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-600 disabled:opacity-50"
                  >
                    Advance
                  </button>
                ) : (
                  <span className="text-xs text-emerald-300">Complete</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
