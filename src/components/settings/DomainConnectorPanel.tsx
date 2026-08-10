"use client";

import { useEffect, useState } from "react";

type DomainStatus = {
  platform: {
    configured: boolean;
    clientIdSet: boolean;
    secretSet: boolean;
    redirectUri: string;
    probe: {
      ok: boolean;
      configured: boolean;
      tokenOk?: boolean;
      apiOk?: boolean;
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

  useEffect(() => {
    void load();
  }, []);

  const platform = status?.platform;
  const org = status?.organisation;

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Domain</h2>
          <p className="mt-1 text-sm text-slate-400">
            Property syndication (Listings Management) · OAuth client on{" "}
            <span className="text-slate-300">app.digitalgate.com.au</span>
          </p>
        </div>
        <a
          href="/api/connectors/domain/connect"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Connect Domain account
        </a>
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
          {platform.probe ? (
            <li>
              Client-credentials probe:{" "}
              <span className={platform.probe.ok ? "text-emerald-400" : "text-amber-400"}>
                {platform.probe.message}
              </span>
            </li>
          ) : null}
          {org ? (
            <li>
              Org ({org.name}):{" "}
              <span className={org.connected ? "text-emerald-400" : "text-slate-500"}>
                {org.connected
                  ? `Connected${org.connectedAt ? ` · ${new Date(org.connectedAt).toLocaleString("en-AU")}` : ""}`
                  : "Not connected — use Connect Domain account for agency context"}
              </span>
            </li>
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
