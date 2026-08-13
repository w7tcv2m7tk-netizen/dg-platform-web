"use client";

import { useEffect, useState } from "react";

type ReaIntegration = {
  ownerId: string;
  ownerType?: string;
  scopes: string[];
  integrationId?: string;
};

type ReaStatus = {
  platform: {
    configured: boolean;
    oauthEndpointsReady: boolean;
    authMode?: string;
    clientIdSet: boolean;
    secretSet: boolean;
    apiBaseUrl: string;
    tokenUrlSet: boolean;
    publishImplemented: boolean;
    probe: {
      ok: boolean;
      configured: boolean;
      tokenOk?: boolean;
      apiOk?: boolean;
      probePath?: string;
      message: string;
      integrations?: ReaIntegration[];
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
      listingWriteGranted?: boolean;
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
  const [agencyId, setAgencyId] = useState("");

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
    const data = json.data as ReaStatus;
    setStatus(data);
    if (data.organisation?.reaAgencyId && !agencyId) {
      setAgencyId(data.organisation.reaAgencyId);
    }
  }

  async function activate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/rea/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaAgencyId: agencyId.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not activate REA agency");
      return;
    }
    if (json.data?.warning) {
      setError(json.data.warning);
    }
    await load();
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
    setAgencyId("");
    await load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const configured = Boolean(status?.platform.configured);
  const connected = Boolean(status?.organisation?.connected);
  const integrations = status?.platform.probe?.integrations ?? [];
  const platformProbeOk = Boolean(status?.platform.probe?.ok);

  return (
    <div className="dg-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Property</p>
          <h2 className="font-semibold text-white">realestate.com.au (REA)</h2>
          <p className="mt-1 text-sm text-slate-400">
            Partner Platform · client_credentials · Listing Upload (REAXML). Agency
            activation is via Ignite / Change of Uploader — not a user OAuth redirect.
          </p>
        </div>
      </div>

      {flash === "connected" ? (
        <p className="text-sm text-emerald-400">REA agency activated.</p>
      ) : null}
      {flash === "error" ? (
        <p className="text-sm text-amber-400">
          {flashMessage || "REA connect note — see message above."}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading REA status…</p>
      ) : status ? (
        <ul className="space-y-2 text-sm text-slate-400">
          <li>
            Platform credentials:{" "}
            <span className={configured ? "text-emerald-400" : "text-amber-400"}>
              {configured ? "Configured" : "Missing REA_CLIENT_ID / SECRET"}
            </span>
          </li>
          <li className="font-mono text-xs text-slate-500">
            API: {status.platform.apiBaseUrl} · auth:{" "}
            {status.platform.authMode || "client_credentials"}
          </li>
          <li>
            Listing upload:{" "}
            <span
              className={
                status.platform.publishImplemented ? "text-sky-300" : "text-amber-400"
              }
            >
              {status.platform.publishImplemented
                ? "Wired (accept → pending)"
                : "Not implemented"}
            </span>
          </li>
          {status.platform.probe ? (
            <li>
              Platform probe:{" "}
              <span className={platformProbeOk ? "text-emerald-400" : "text-amber-400"}>
                {status.platform.probe.message}
              </span>
            </li>
          ) : null}
          {integrations.length > 0 ? (
            <li className="text-xs text-slate-500">
              Integrations:{" "}
              {integrations
                .map((i) =>
                  i.scopes.length
                    ? `${i.ownerId} [${i.scopes.join(", ")}]`
                    : i.ownerId,
                )
                .join(" · ")}
            </li>
          ) : null}
          <li>
            Organisation ({status.organisation?.name}):{" "}
            {connected ? (
              <span className="text-emerald-400">
                Agency {status.organisation?.reaAgencyId}
                {status.organisation?.connectedAt
                  ? ` · ${new Date(status.organisation.connectedAt).toLocaleString("en-AU")}`
                  : ""}
              </span>
            ) : (
              <span className="text-slate-500">Not activated — bind agency id below</span>
            )}
          </li>
          {status.organisation?.probe ? (
            <li
              className={
                status.organisation.probe.ok ? "text-emerald-400/90" : "text-amber-400/90"
              }
            >
              Org probe: {status.organisation.probe.message}
            </li>
          ) : null}
          {status.organisation?.lastError ? (
            <li className="text-amber-400">Last note: {status.organisation.lastError}</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-slate-500">
          REA agency id (agentID)
          <input
            type="text"
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            placeholder="e.g. XYZABC"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            disabled={!configured || busy}
          />
        </label>
        <button
          type="button"
          disabled={!configured || busy || !agencyId.trim()}
          onClick={() => void activate()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          title={
            !configured
              ? "Set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel"
              : "Bind this organisation to a REA agency id"
          }
        >
          {busy ? "Saving…" : connected ? "Update agency" : "Activate agency"}
        </button>
        {connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Disconnect
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
        Differs from Domain: Domain uses Authorization Code per agency user; REA uses shared
        Partner credentials + per-agency Ignite activation. Docs:{" "}
        <span className="font-mono">docs/connectors/REA.md</span>.
      </p>
    </div>
  );
}
