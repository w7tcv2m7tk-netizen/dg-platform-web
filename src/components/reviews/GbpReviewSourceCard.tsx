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
  gbpLastError?: string | null;
};

function formatSyncAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-AU");
  } catch {
    return iso;
  }
}

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

  const synced = Boolean(state.gbpLastSyncAt);
  const badge = !state.gbpConnected
    ? { label: "available", className: "rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300" }
    : state.gbpReviewsBlockedReason
      ? {
          label: "connected · reviews blocked",
          className: "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300",
        }
      : synced && (state.gbpLocations > 0 || state.gbpReviewsCached > 0)
        ? {
            label: "connected",
            className: "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300",
          }
        : {
            label: "connected · not synced",
            className: "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300",
          };

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
    const blocked =
      typeof data.reviewsBlockedReason === "string" ? data.reviewsBlockedReason : null;
    const lastError =
      Array.isArray(data.errors) && data.errors.length
        ? String(data.errors[0])
        : data.health?.lastError ?? null;
    setState({
      gbpConnected: true,
      gbpLocations: Array.isArray(data.locations) ? data.locations.length : state.gbpLocations,
      gbpReviewsCached: typeof data.reviewsCached === "number" ? data.reviewsCached : 0,
      gbpReviewsAvailable: Boolean(data.reviewsOk),
      gbpReviewsBlockedReason: blocked,
      gbpLastSyncAt: data.syncedAt ?? new Date().toISOString(),
      gbpLastError: lastError,
    });
    if (!res.ok) {
      setError(data.message ?? lastError ?? "Sync completed with errors");
      setNote(null);
      return;
    }
    if (blocked) {
      setNote(data.message ?? "Locations synced — reviews still blocked by Google API");
      return;
    }
    setNote(data.message ?? "Sync complete");
  }

  const lastSyncLabel = formatSyncAt(state.gbpLastSyncAt);

  return (
    <div className="dg-card flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-white">Google Business Profile</h2>
          <span className={badge.className}>{badge.label}</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
        {connectorHint ? <p className="mt-2 text-xs text-slate-500">{connectorHint}</p> : null}

        {state.gbpConnected ? (
          <dl className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <div>
              <dt className="inline text-slate-600">Status · </dt>
              <dd className="inline text-slate-300">
                Connected
                {synced ? "" : " — run sync to pull locations"}
              </dd>
            </div>
            <div>
              <dt className="inline text-slate-600">Last sync · </dt>
              <dd className="inline text-slate-300">{lastSyncLabel ?? "Never"}</dd>
            </div>
            <div>
              <dt className="inline text-slate-600">Locations · </dt>
              <dd className="inline text-slate-300">{state.gbpLocations}</dd>
            </div>
            <div>
              <dt className="inline text-slate-600">Reviews in feed · </dt>
              <dd
                className={
                  state.gbpReviewsAvailable
                    ? "inline text-emerald-400/90"
                    : state.gbpReviewsBlockedReason
                      ? "inline text-amber-400/90"
                      : "inline text-slate-300"
                }
              >
                {state.gbpReviewsAvailable
                  ? state.gbpReviewsCached
                  : state.gbpReviewsBlockedReason
                    ? "Blocked"
                    : synced
                      ? "0"
                      : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        {state.gbpConnected && state.gbpReviewsBlockedReason ? (
          <p className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
            Reviews blocked: {state.gbpReviewsBlockedReason}
          </p>
        ) : null}

        {state.gbpConnected && state.gbpLastError && !state.gbpReviewsBlockedReason ? (
          <p className="mt-3 rounded-lg border border-rose-800/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-200/90">
            Last sync error: {state.gbpLastError}
          </p>
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
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
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
