"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LinkedInOrg = {
  urn: string;
  role?: string;
  state?: string;
  name?: string;
  vanityName?: string;
};

type LinkedInStatus = {
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
    label: string | null;
    member: { name?: string; email?: string } | null;
    organizations: LinkedInOrg[];
    selectedOrganizationUrn: string | null;
    lastError: string | null;
    probe: {
      ok: boolean;
      connected: boolean;
      apiOk?: boolean;
      message: string;
    } | null;
  };
};

export function LinkedInConnectorPanel({
  flash,
  flashMessage,
}: {
  flash?: "connected" | "error" | null;
  flashMessage?: string | null;
}) {
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/linkedin/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load LinkedIn status");
      return;
    }
    setStatus(json.data as LinkedInStatus);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/linkedin/disconnect", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect LinkedIn");
      return;
    }
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const platform = status?.platform;
  const org = status?.organisation;
  const pages = org?.organizations ?? [];

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Social</p>
          <h2 className="font-semibold text-white">LinkedIn</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect the DigitalGate company page. Compose still saves drafts — posting to
            LinkedIn is the next slice.
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
              Disconnect
            </button>
          ) : null}
          <a
            href="/api/connectors/linkedin/connect"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${
              platform?.configured
                ? "bg-blue-600 hover:bg-blue-500"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
          >
            {org?.connected ? "Reconnect" : "Connect LinkedIn"}
          </a>
        </div>
      </div>

      {flash === "connected" ? (
        <p className="mt-3 text-sm text-emerald-400">
          LinkedIn connected. Company pages appear below when Community Management API
          access is granted.
        </p>
      ) : null}
      {flash === "error" ? (
        <p className="mt-3 text-sm text-amber-400">
          LinkedIn connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
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
                : "Missing LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET"}
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
              {org.member?.name || org.member?.email ? (
                <li>
                  Signed in as{" "}
                  <span className="text-slate-300">
                    {org.member.name || org.member.email}
                  </span>
                </li>
              ) : null}
              {org.probe ? (
                <li>
                  Probe:{" "}
                  <span className={org.probe.ok ? "text-emerald-400" : "text-amber-400"}>
                    {org.probe.message}
                  </span>
                </li>
              ) : null}
            </>
          ) : null}
        </ul>
      ) : null}

      {pages.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Company pages</p>
          <ul className="space-y-2">
            {pages.map((page) => {
              const selected = page.urn === org?.selectedOrganizationUrn;
              return (
                <li
                  key={page.urn}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-white">
                    {page.name || page.vanityName || page.urn}
                    {selected ? (
                      <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-300">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[page.role, page.state, page.vanityName].filter(Boolean).join(" · ")}
                  </p>
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
        <Link href="/apps/social/compose" className="text-blue-400 hover:underline">
          Compose drafts →
        </Link>
      </div>
    </div>
  );
}
