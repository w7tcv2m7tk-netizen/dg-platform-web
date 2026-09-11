"use client";

import { useEffect, useState } from "react";

type MicrosoftStatus = {
  platform: {
    configured: boolean;
  };
  organisation: {
    name: string;
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
    health: {
      status: string;
      lastSyncAt?: string | null;
      messagesSynced?: number;
      hasIssue?: boolean;
    } | null;
  };
};

export function MicrosoftMailboxPanel({
  flash,
  canManage,
}: {
  flash?: "connected" | "error" | null;
  canManage: boolean;
}) {
  const [status, setStatus] = useState<MicrosoftStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/microsoft-365/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError("Could not load Microsoft 365 connection status.");
      return;
    }
    setStatus(json.data as MicrosoftStatus);
  }

  async function disconnect() {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/microsoft-365/disconnect", {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      setError("Microsoft 365 could not be disconnected. Please try again.");
      return;
    }
    await load();
  }

  async function sync() {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/microsoft-365/sync", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError("Microsoft 365 sync could not be completed. Please try again.");
      await load();
      return;
    }
    setSyncNote(typeof json.data?.message === "string" ? json.data.message : "Sync complete");
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const platform = status?.platform;
  const org = status?.organisation;
  const email = org?.email ?? null;

  return (
    <section className="max-w-lg space-y-3 rounded-lg border border-slate-800 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Microsoft 365 / Outlook</h2>
          <p className="mt-1 text-sm text-slate-400">
            Sync inbox and sent mail into Communications while Microsoft remains the mailbox provider.
          </p>
        </div>
        {canManage ? (
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
              href="/api/connectors/microsoft-365/connect"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white ${
                platform?.configured
                  ? "bg-sky-600 hover:bg-sky-500"
                  : "pointer-events-none bg-slate-700 text-slate-400"
              }`}
            >
              {org?.connected ? "Reconnect" : "Connect Microsoft"}
            </a>
          </div>
        ) : null}
      </div>

      {flash === "connected" ? (
        <p className="text-sm text-emerald-400">
          Microsoft 365 connected{email ? ` · ${email}` : ""}.
        </p>
      ) : null}
      {flash === "error" ? (
        <p className="text-sm text-amber-400">
          Microsoft 365 connection could not be completed. Please try again.
        </p>
      ) : null}
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      {syncNote ? <p className="text-sm text-emerald-400">{syncNote}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-500">Checking connection…</p>
      ) : !platform?.configured ? (
        <p className="text-xs text-amber-400/90">
          Microsoft 365 connection is not available right now. Contact your DigitalGate administrator
          if you need this mailbox connected.
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
            <p>{canManage ? "No sync yet — use Sync now to pull recent mail." : "No sync recorded yet."}</p>
          )}
          {org.health?.hasIssue ? (
            <p className="text-amber-400">The last mailbox sync needs attention.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Not connected for {org?.name ?? "this organisation"}.</p>
      )}
    </section>
  );
}
