"use client";

import Link from "next/link";
import { useState } from "react";

type GbpSourceState = {
  gbpConnected: boolean;
  gbpLocations: number;
  gbpReviewsCached: number;
  gbpReviewsAvailable: boolean;
  gbpReviewsBlockedReason: string | null;
  gbpLastSyncAt: string | null;
};

export function GbpReviewSourceCard({
  description,
  connectorHint,
  initial,
}: {
  description: string;
  connectorHint?: string;
  initial: GbpSourceState;
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const live = state.gbpConnected
    ? state.gbpLocations > 0 || state.gbpReviewsCached > 0
      ? "connected"
      : "available"
    : "available";

  async function sync() {
    setBusy(true);
    setError(null);
    setNote(null);
    const res = await fetch("/api/v1/connectors/google/sync", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok && !json.data) {
      setError(json.error?.message ?? "Sync failed");
      return;
    }
    const data = json.data ?? {};
    setState({
      gbpConnected: true,
      gbpLocations: Array.isArray(data.locations) ? data.locations.length : state.gbpLocations,
      gbpReviewsCached: typeof data.reviewsCached === "number" ? data.reviewsCached : 0,
      gbpReviewsAvailable: Boolean(data.reviewsOk),
      gbpReviewsBlockedReason: data.reviewsBlockedReason ?? null,
      gbpLastSyncAt: data.syncedAt ?? new Date().toISOString(),
    });
    setNote(data.message ?? (res.ok ? "Sync complete" : "Sync completed with errors"));
    if (!res.ok && data.message) setError(null);
  }

  return (
    <div className="dg-card flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-white">Google Business Profile</h2>
          <span
            className={
              live === "connected"
                ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
                : "rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300"
            }
          >
            {state.gbpConnected && live === "connected"
              ? "connected"
              : state.gbpConnected
                ? "connected · not synced"
                : "available"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
        {connectorHint ? <p className="mt-2 text-xs text-slate-500">{connectorHint}</p> : null}
        {state.gbpConnected ? (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li>
              Locations cached:{" "}
              <span className="text-slate-300">{state.gbpLocations}</span>
              {state.gbpLastSyncAt
                ? ` · last sync ${new Date(state.gbpLastSyncAt).toLocaleString("en-AU")}`
                : " · run sync to pull locations"}
            </li>
            {state.gbpReviewsAvailable ? (
              <li className="text-emerald-400/90">
                Reviews in Universal Review feed: {state.gbpReviewsCached}
              </li>
            ) : state.gbpReviewsBlockedReason ? (
              <li className="text-amber-400/90">{state.gbpReviewsBlockedReason}</li>
            ) : (
              <li>Reviews: not synced yet (or API blocked — location metadata still useful)</li>
            )}
          </ul>
        ) : null}
        {error ? <p className="mt-2 text-xs text-amber-400">{error}</p> : null}
        {note ? <p className="mt-2 text-xs text-emerald-400">{note}</p> : null}
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {state.gbpConnected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void sync()}
            className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy ? "Syncing…" : "Sync GBP"}
          </button>
        ) : null}
        <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
          {state.gbpConnected ? "Connector settings" : "Connect Google"}
        </Link>
        <Link href="/apps/reviews/inbox" className="text-blue-400 hover:underline">
          Reputation inbox
        </Link>
      </div>
    </div>
  );
}
