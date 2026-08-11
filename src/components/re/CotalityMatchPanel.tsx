"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CotalityMatchPanelProps = {
  propertyId: string;
  cotalityPropertyId?: string | number | null;
  matchType?: string | null;
  matchedAddress?: string | null;
};

export function CotalityMatchPanel({
  propertyId,
  cotalityPropertyId,
  matchType,
  matchedAddress,
}: CotalityMatchPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const matched = cotalityPropertyId != null && cotalityPropertyId !== "";

  async function runMatch() {
    setPending(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/v1/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match_cotality" }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Cotality match failed");
      return;
    }

    if (json?.meta?.matched) {
      setMessage(`Matched · Cotality id ${String(json.meta.cotalityPropertyId)}`);
    } else {
      setMessage(json?.meta?.message ?? "No Cotality property id for this address");
    }
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Cotality
      </p>
      {matched ? (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-slate-300">
            Matched
            {matchType ? (
              <span className="text-slate-500"> · type {matchType}</span>
            ) : null}
          </p>
          <p className="font-mono text-xs text-slate-500">
            id {String(cotalityPropertyId)}
          </p>
          {matchedAddress ? (
            <p className="text-xs text-slate-500">{matchedAddress}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void runMatch()}
            disabled={pending}
            className="mt-2 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline disabled:opacity-50"
          >
            {pending ? "Re-matching…" : "Re-match"}
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-slate-400">Not matched yet</p>
          <button
            type="button"
            onClick={() => void runMatch()}
            disabled={pending}
            className="mt-3 rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-50"
          >
            {pending ? "Matching…" : "Match with Cotality"}
          </button>
        </div>
      )}
      {message ? <p className="mt-2 text-sm text-emerald-400/90">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
