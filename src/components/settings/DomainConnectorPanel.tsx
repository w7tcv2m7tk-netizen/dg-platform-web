"use client";

import { useEffect, useState } from "react";

type DomainStatus = {
  platform: {
    configured: boolean;
    clientIdSet: boolean;
    secretSet: boolean;
    redirectUri: string;
    apiPathPrefix?: string;
    probe: {
      ok: boolean;
      configured: boolean;
      skipped?: boolean;
      tokenOk?: boolean;
      apiOk?: boolean;
      probePath?: string;
      expiresAt?: string;
      message: string;
    } | null;
  };
  organisation: {
    id: string;
    name: string;
    connected: boolean;
    expiresAt: string | null;
    connectedAt: string | null;
    scope: string | null;
    domainAgencyId?: number | null;
    agencies?: Array<{ id: number; name?: string }>;
    lastError?: string | null;
    probe: {
      ok: boolean;
      connected: boolean;
      tokenOk?: boolean;
      apiOk?: boolean;
      probePath?: string;
      expiresAt?: string;
      scope?: string;
      securityReason?: string | null;
      domainAgencyId?: number | null;
      message: string;
    } | null;
  } | null;
};

export function DomainConnectorPanel({
  flash,
  flashMessage,
}: {
  flash?: "connected" | "error" | null;
  flashMessage?: string | null;
}) {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/domain/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load Domain status");
      return;
    }
    setStatus(json.data as DomainStatus);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/domain/disconnect", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect Domain");
      return;
    }
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const platform = status?.platform;
  const org = status?.organisation;

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Property</p>
          <h2 className="font-semibold text-white">Domain</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect this organisation to Domain for property listing syndication and listing-status evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {org?.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
            >
              {busy ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : null}
          <a
            href="/api/connectors/domain/connect"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            {org?.connected ? "Reconnect" : "Connect Domain account"}
          </a>
        </div>
      </div>

      {flash === "connected" ? (
        <p className="mt-3 text-sm text-emerald-400">Domain account connected for this organisation.</p>
      ) : null}
      {flash === "error" ? (
        <p className="mt-3 text-sm text-amber-400">
          Domain connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
      {loading && !status ? (
        <p className="mt-3 text-sm text-slate-500">Checking…</p>
      ) : null}

      {platform ? (
        <div className="mt-4 space-y-3 text-sm text-slate-400">
          <p>
            DigitalGate:{" "}
            <span className={platform.configured ? "text-emerald-400" : "text-amber-400"}>
              {platform.configured ? "Ready" : "Platform setup required"}
            </span>
          </p>
          {org ? (
            <>
              <p>
                {org.name}:{" "}
                <span className={org.connected && org.probe?.ok ? "text-emerald-400" : org.connected ? "text-amber-400" : "text-slate-500"}>
                  {org.connected && org.probe?.ok
                    ? "Connected and authorised for Domain Listings Management"
                    : org.connected
                      ? "Connected to Domain — Listings Management access needs attention"
                      : "Not connected"}
                </span>
              </p>
              {org.connected && org.probe?.apiOk === false ? (
                <p className="text-amber-400">
                  Domain sign-in succeeded, but Listings Management access is not yet authorised for this organisation. Confirm the correct Domain Listings Management package and environment, then reconnect.
                </p>
              ) : null}
              {org.domainAgencyId ? (
                <p className="text-slate-400">Domain agency ID: {org.domainAgencyId}</p>
              ) : null}
              {org.agencies && org.agencies.length > 0 ? (
                <p className="text-slate-400">
                  Available {org.agencies.length === 1 ? "agency" : "agencies"}:{" "}
                  {org.agencies.map((a) => a.name ?? String(a.id)).join(", ")}
                </p>
              ) : null}
              {org.lastError ? <p className="text-amber-400">{org.lastError}</p> : null}
            </>
          ) : null}
        </div>
      <button
        type="button"
        onClick={() => void load()}
        className="mt-4 text-xs text-blue-400 hover:underline"
      >
        Refresh status
      </button>
    </div>
  );
}
