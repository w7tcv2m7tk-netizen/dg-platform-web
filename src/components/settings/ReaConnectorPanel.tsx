"use client";

import { useEffect, useState } from "react";

type ReaStatus = {
  platform: {
    configured: boolean;
    oauthEndpointsReady: boolean;
    clientIdSet: boolean;
    secretSet: boolean;
    redirectUri: string;
    apiBaseUrl: string;
    authorizeUrlSet: boolean;
    tokenUrlSet: boolean;
    publishImplemented: boolean;
    probe: {
      ok: boolean;
      configured: boolean;
      oauthEndpointsReady?: boolean;
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
    reaAgencyId?: string | null;
    lastError?: string | null;
    probe: {
      ok: boolean;
      connected: boolean;
      message: string;
    } | null;
  } | null;
};

export function ReaConnectorPanel({
  flash,
  flashMessage,
}: {
  flash?: "connected" | "error" | null;
  flashMessage?: string | null;
}) {
  const [status, setStatus] = useState<ReaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/rea/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load REA status");
      return;
    }
    setStatus(json.data as ReaStatus);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/rea/disconnect", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect REA");
      return;
    }
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const configured = Boolean(status?.platform.configured);
  const endpointsReady = Boolean(status?.platform.oauthEndpointsReady);
  const connectTitle = !configured
    ? "Set REA_CLIENT_ID + REA_CLIENT_SECRET after partner access"
    : !endpointsReady
      ? "Set REA_AUTH_AUTHORIZE_URL + REA_AUTH_TOKEN_URL from partner docs"
      : "OAuth authorize flow not live yet — Connect stays disabled until partner smoke";

  return (
    <div className="dg-card space-y-4">
      <div>
        <h2 className="font-semibold text-white">realestate.com.au (REA)</h2>
        <p className="mt-1 text-sm text-slate-400">
          Listing Hub syndication scaffold — partner API access required. No fake “connected /
          published” until OAuth + upsert smoke.
        </p>
      </div>

      {flash === "connected" ? (
        <p className="text-sm text-emerald-400">REA connected.</p>
      ) : null}
      {flash === "error" ? (
        <p className="text-sm text-amber-400">
          {flashMessage || "REA connect failed — see message above."}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading REA status…</p>
      ) : status ? (
        <ul className="space-y-2 text-sm text-slate-400">
          <li>
            Platform credentials:{" "}
            <span className={configured ? "text-sky-300" : "text-amber-400"}>
              {configured ? "Set" : "Missing"}
            </span>
          </li>
          <li>
            OAuth endpoints:{" "}
            <span className={endpointsReady ? "text-sky-300" : "text-amber-400"}>
              {endpointsReady ? "Configured" : "Unknown (awaiting partner docs)"}
            </span>
          </li>
          <li>
            Listing upsert:{" "}
            <span className="text-amber-400">
              {status.platform.publishImplemented ? "Ready" : "Not implemented"}
            </span>
          </li>
          <li className="font-mono text-xs text-slate-500 break-all">
            Redirect: {status.platform.redirectUri}
          </li>
          {status.platform.probe ? (
            <li className="text-amber-400/90">{status.platform.probe.message}</li>
          ) : null}
          <li>
            Organisation:{" "}
            {status.organisation?.connected ? (
              <span className="text-sky-300">Tokens stored</span>
            ) : (
              <span className="text-slate-500">Not connected</span>
            )}
          </li>
          {status.organisation?.probe ? (
            <li className="text-amber-400/90">{status.organisation.probe.message}</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          className="rounded-full bg-slate-700 px-4 py-2 text-sm font-medium text-white opacity-50"
          title={connectTitle}
        >
          Connect REA account
        </button>

        {status?.organisation?.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-amber-400">{error}</p> : null}

      <p className="text-xs text-slate-500">
        Differs from Domain: Domain has a public developer portal + Listings Management sandbox;
        REA is grant-gated. See docs/connectors/REA.md. Route reserved:{" "}
        <span className="font-mono">/api/connectors/rea/connect</span>.
      </p>
    </div>
  );
}
