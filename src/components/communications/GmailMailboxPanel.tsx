"use client";

import { useEffect, useState } from "react";

type GmailStatus = {
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
    email: string | null;
    expiresAt: string | null;
    connectedAt: string | null;
    scope: string | null;
    probe: {
      ok: boolean;
      connected: boolean;
      apiOk?: boolean;
      email?: string | null;
      message: string;
    } | null;
    health: {
      status: string;
      lastSyncAt?: string | null;
      lastError?: string | null;
      messagesSynced?: number;
      message?: string | null;
    } | null;
  };
};

export function GmailMailboxPanel({
  flash,
  flashMessage,
}: {
  flash?: "connected" | "error" | null;
  flashMessage?: string | null;
}) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/google-gmail/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load Gmail status");
      return;
    }
    setStatus(json.data as GmailStatus);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/google-gmail/disconnect", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect Gmail");
      return;
    }
    await load();
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/google-gmail/sync", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.data?.message ?? json.error?.message ?? "Gmail sync failed");
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
  const email = org?.email || org?.probe?.email || null;

  return (
    <section className="max-w-lg space-y-3 rounded-lg border border-slate-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Google Workspace / Gmail</h2>
          <p className="mt-1 text-sm text-slate-400">
            OAuth connect for read inbox, sync sent, and associate with Contacts. Google remains
            the mailbox — DigitalGate orchestrates.
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
                {busy ? "Working…" : "Sync now"}
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
            href="/api/connectors/google-gmail/connect"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${
              platform?.configured
                ? "bg-sky-600 hover:bg-sky-500"
                : "pointer-events-none bg-slate-700 text-slate-400"
            }`}
          >
            {org?.connected ? "Reconnect" : "Connect Gmail"}
          </a>
        </div>
      </div>

      {flash === "connected" ? (
        <p className="text-sm text-emerald-400">
          Gmail connected{email ? ` · ${email}` : ""}. Recent mail syncs after connect; use Sync
          now anytime.
        </p>
      ) : null}
      {flash === "error" ? (
        <p className="text-sm text-amber-400">
          Gmail connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
        </p>
      ) : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      {syncNote ? <p className="text-sm text-emerald-400">{syncNote}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-500">Checking connection…</p>
      ) : !platform?.configured ? (
        <p className="text-xs text-amber-400/90">
          Platform Google OAuth not configured (GOOGLE_CLIENT_ID / SECRET). Add credentials and
          register redirect URI {platform?.redirectUri || "…/api/connectors/google-gmail/callback"}{" "}
          in Google Cloud Console.
        </p>
      ) : org?.connected ? (
        <div className="space-y-1 text-xs text-slate-400">
          <p>
            <span className="text-emerald-400">Connected</span>
            {email ? ` · ${email}` : ""}
            {org.connectedAt
              ? ` · since ${new Date(org.connectedAt).toLocaleString("en-AU")}`
              : ""}
          </p>
          {org.health?.lastSyncAt ? (
            <p>
              Last sync {new Date(org.health.lastSyncAt).toLocaleString("en-AU")}
              {org.health.messagesSynced != null
                ? ` · ${org.health.messagesSynced} message(s)`
                : ""}
            </p>
          ) : (
            <p>No sync yet — click Sync now to pull recent inbox/sent.</p>
          )}
          {org.health?.lastError ? (
            <p className="text-amber-400">Last sync error: {org.health.lastError}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Not connected for {org?.name ?? "this organisation"}.</p>
      )}
    </section>
  );
}
