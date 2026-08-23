"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GbpLocation = {
  name: string;
  title?: string;
  websiteUri?: string;
  primaryPhone?: string;
  locality?: string;
  administrativeArea?: string;
  primaryCategory?: string;
  mapsUri?: string;
  placeId?: string;
};

type GoogleStatus = {
  platform: {
    configured: boolean;
    clientIdSet: boolean;
    secretSet: boolean;
    redirectUri: string;
  };
  organisation: {
    id: string;
    name: string;
    connected: boolean;
    expiresAt: string | null;
    connectedAt: string | null;
    scope: string | null;
    probe: {
      ok: boolean;
      connected: boolean;
      apiOk?: boolean;
      expiresAt?: string;
      message: string;
      accountCount?: number;
    } | null;
    health: {
      status: string;
      lastSyncAt?: string | null;
      lastError?: string | null;
      accountCount?: number;
      locationCount?: number;
      reviewsSynced?: number;
      reviewsAvailable?: boolean;
      reviewsBlockedReason?: string | null;
      message?: string | null;
    } | null;
    accounts: Array<{ name: string; accountName?: string; type?: string }>;
    locations: GbpLocation[];
    reviewsCached: number;
    reviewsAvailable: boolean;
    reviewsBlockedReason: string | null;
  };
};

export function GoogleGbpConnectorPanel({
  flash,
  flashMessage,
}: {
  flash?: "connected" | "error" | null;
  flashMessage?: string | null;
}) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/google/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load Google status");
      return;
    }
    setStatus(json.data as GoogleStatus);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/google/disconnect", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect Google");
      return;
    }
    await load();
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/google/sync", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.data?.message ?? json.error?.message ?? "GBP sync failed");
      await load();
      return;
    }
    setSyncNote(json.data?.message ?? "Sync complete");
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const platform = status?.platform;
  const org = status?.organisation;
  const locations = org?.locations ?? [];

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Business</p>
          <h2 className="font-semibold text-white">Google Business Profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Accounts, locations, and profile fields sync when connected. Reviews are{" "}
            <span className="text-slate-300">best-effort / limited</span> — if Google denies the
            Reviews API we keep location metadata and surface the block reason (no fake scores).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {org?.connected ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sync()}
                className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy ? "Working…" : "Sync locations"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void disconnect()}
                className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : null}
          <a
            href="/api/connectors/google/connect"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${
              platform?.configured
                ? "bg-blue-600 hover:bg-blue-500"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
          >
            {org?.connected ? "Reconnect" : "Connect Google"}
          </a>
        </div>
      </div>

      {flash === "connected" ? (
        <p className="mt-3 text-sm text-emerald-400">
          Google Business Profile connected — run Sync locations to pull accounts and profiles.
        </p>
      ) : null}
      {flash === "error" ? (
        <p className="mt-3 text-sm text-amber-400">
          Google connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
      {syncNote ? <p className="mt-3 text-sm text-emerald-400">{syncNote}</p> : null}
      {loading && !status ? (
        <p className="mt-3 text-sm text-slate-500">Checking…</p>
      ) : null}

      {platform ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          <li>
            Platform credentials:{" "}
            <span className={platform.configured ? "text-emerald-400" : "text-amber-400"}>
              {platform.configured
                ? "Configured"
                : "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET"}
            </span>
          </li>
          <li className="font-mono text-xs text-slate-500">
            Redirect: {platform.redirectUri}
          </li>
          {org ? (
            <>
              <li>
                Org ({org.name}):{" "}
                <span className={org.connected ? "text-emerald-400" : "text-slate-500"}>
                  {org.connected
                    ? `Connected${org.connectedAt ? ` · ${new Date(org.connectedAt).toLocaleString("en-AU")}` : ""}`
                    : "Not connected"}
                </span>
              </li>
              {org.probe ? (
                <li>
                  GBP probe:{" "}
                  <span className={org.probe.ok ? "text-emerald-400" : "text-amber-400"}>
                    {org.probe.message}
                  </span>
                </li>
              ) : null}
              {org.health?.lastSyncAt ? (
                <li>
                  Last sync:{" "}
                  <span className="text-slate-300">
                    {new Date(org.health.lastSyncAt).toLocaleString("en-AU")}
                    {org.health.message ? ` · ${org.health.message}` : ""}
                  </span>
                </li>
              ) : org.connected ? (
                <li className="text-amber-400/90">
                  Connected but not synced yet — use Sync locations.
                </li>
              ) : null}
              {org.reviewsBlockedReason ? (
                <li className="text-amber-400/90">
                  Reviews limited: {org.reviewsBlockedReason}
                </li>
              ) : org.reviewsAvailable ? (
                <li className="text-emerald-400">
                  Reviews cached: {org.reviewsCached} (feeds Reputation when present)
                </li>
              ) : org.connected ? (
                <li className="text-slate-500">
                  Reviews: not synced yet — Sync locations may still return limited reviews
                </li>
              ) : null}
            </>
          ) : null}
        </ul>
      ) : null}

      {locations.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Locations</p>
          <ul className="space-y-2">
            {locations.map((loc) => {
              const place = [loc.locality, loc.administrativeArea].filter(Boolean).join(", ");
              return (
                <li
                  key={loc.name}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-white">{loc.title || loc.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[loc.primaryCategory, place, loc.primaryPhone].filter(Boolean).join(" · ") ||
                      loc.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    {loc.websiteUri ? (
                      <a
                        href={loc.websiteUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Website
                      </a>
                    ) : null}
                    {loc.mapsUri ? (
                      <a
                        href={loc.mapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Maps
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <button type="button" onClick={() => void load()} className="text-blue-400 hover:underline">
          Refresh status
        </button>
        <Link href="/apps/reviews/sources" className="text-blue-400 hover:underline">
          Reputation sources →
        </Link>
      </div>
    </div>
  );
}
