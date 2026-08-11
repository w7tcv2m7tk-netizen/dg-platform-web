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
            Property syndication (Listings Management) · OAuth client on{" "}
            <span className="text-slate-300">app.digitalgate.com.au</span>
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
        <ul className="mt-4 space-y-2 text-sm text-slate-400">
          <li>
            Platform credentials:{" "}
            <span className={platform.configured ? "text-emerald-400" : "text-amber-400"}>
              {platform.configured ? "Configured" : "Missing DOMAIN_CLIENT_ID / SECRET"}
            </span>
          </li>
          <li className="font-mono text-xs text-slate-500">
            Redirect: {platform.redirectUri}
          </li>
            <li className="font-mono text-xs text-slate-500">
            API path prefix:{" "}
            {platform.apiPathPrefix ? (
              platform.apiPathPrefix
            ) : (
              <span className="text-amber-400">
                (none — Primary /v1/…). For Sandbox package set DOMAIN_API_PATH_PREFIX=/sandbox
              </span>
            )}
            </li>
          {platform.probe ? (
            <li>
              Client-credentials probe:{" "}
              <span
                className={
                  platform.probe.skipped
                    ? "text-slate-300"
                    : platform.probe.ok
                      ? "text-emerald-400"
                      : "text-amber-400"
                }
              >
                {platform.probe.message}
              </span>
            </li>
          ) : null}
          {org ? (
            <>
              <li>
                Org ({org.name}):{" "}
                <span className={org.connected ? "text-emerald-400" : "text-slate-500"}>
                  {org.connected
                    ? `Connected${org.connectedAt ? ` · ${new Date(org.connectedAt).toLocaleString("en-AU")}` : ""}`
                    : "Not connected — use Connect Domain account for agency context"}
                </span>
              </li>
              {org.scope ? (
                <li className="font-mono text-xs text-slate-500">Org token scopes: {org.scope}</li>
              ) : org.connected ? (
                <li className="text-xs text-amber-400">
                  Org token scopes: (none stored) — reconnect after confirming portal scopes
                </li>
              ) : null}
              {org.domainAgencyId ? (
                <li className="font-mono text-xs text-slate-500">
                  Preferred Domain agency id: {org.domainAgencyId}
                </li>
              ) : null}
              {org.agencies && org.agencies.length > 0 ? (
                <li className="text-xs text-slate-500">
                  Agencies:{" "}
                  {org.agencies
                    .map((a) => (a.name ? `${a.name} (${a.id})` : String(a.id)))
                    .join(", ")}
                </li>
              ) : null}
              {org.probe ? (
                <li>
                  Org API probe
                  {org.probe.probePath ? ` (${org.probe.probePath})` : ""}:{" "}
                  <span className={org.probe.ok ? "text-emerald-400" : "text-amber-400"}>
                    {org.probe.message}
                  </span>
                  {org.probe.securityReason ? (
                    <span className="mt-1 block text-xs text-amber-500">
                      X-Domain-Security-Reason: {org.probe.securityReason}
                    </span>
                  ) : null}
                  {org.probe.apiOk === false ? (
                    <span className="mt-2 block text-xs text-slate-400">
                      OAuth connected ≠ authorised for Listings Management. Fix portal package /
                      env prefix / scopes, then use Reconnect (do not treat as green).
                    </span>
                  ) : null}
                </li>
              ) : null}
              {org.lastError ? (
                <li className="text-amber-400">Last token error: {org.lastError}</li>
              ) : null}
            </>
          ) : null}
        </ul>
      ) : null}

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
