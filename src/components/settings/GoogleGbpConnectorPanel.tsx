"use client";

import { useEffect, useState } from "react";

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
    const res = await fetch("/api/v1/connectors/google/disconnect", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect Google");
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Business</p>
          <h2 className="font-semibold text-white">Google Business Profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Profile, reviews, and insights for AI Visibility — OAuth (GBP manage scope)
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
          Google Business Profile connected for this organisation.
        </p>
      ) : null}
      {flash === "error" ? (
        <p className="mt-3 text-sm text-amber-400">
          Google connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
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
