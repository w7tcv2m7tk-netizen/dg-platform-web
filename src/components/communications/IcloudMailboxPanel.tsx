"use client";

import { useEffect, useState } from "react";

type IcloudStatus = {
  platform: {
    configured: boolean;
    auth: string;
    imapHost: string;
  };
  organisation: {
    id: string;
    name: string;
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
    health: {
      status: string;
      lastSyncAt?: string | null;
      lastError?: string | null;
      messagesSynced?: number;
      message?: string | null;
    } | null;
  };
};

export function IcloudMailboxPanel() {
  const [status, setStatus] = useState<IcloudStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/connectors/apple-icloud/status");
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not load iCloud status");
      return;
    }
    const data = json.data as IcloudStatus;
    setStatus(data);
    if (data.organisation.email && !email) {
      setEmail(data.organisation.email);
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/apple-icloud/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, appPassword }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not connect iCloud");
      return;
    }
    setAppPassword("");
    setSyncNote(`Connected${json.data?.email ? ` · ${json.data.email}` : ""}`);
    await load();
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/apple-icloud/disconnect", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not disconnect iCloud");
      return;
    }
    setAppPassword("");
    await load();
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setSyncNote(null);
    const res = await fetch("/api/v1/connectors/apple-icloud/sync", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.data?.message ?? json.error?.message ?? "iCloud sync failed");
      await load();
      return;
    }
    setSyncNote(json.data?.message ?? "Sync complete");
    await load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const org = status?.organisation;

  return (
    <section className="max-w-lg space-y-3 rounded-lg border border-slate-800 p-4">
      <div>
        <h2 className="text-sm font-medium text-white">Apple iCloud Mail</h2>
        <p className="mt-1 text-sm text-slate-400">
          Connect with an Apple app-specific password (Apple does not offer public OAuth for
          iCloud Mail). iCloud remains the mailbox — DigitalGate syncs into Communications.
        </p>
      </div>

      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      {syncNote ? <p className="text-sm text-emerald-400">{syncNote}</p> : null}

      {loading ? (
        <p className="text-xs text-slate-500">Checking connection…</p>
      ) : org?.connected ? (
        <div className="space-y-3">
          <div className="space-y-1 text-xs text-slate-400">
            <p>
              <span className="text-emerald-400">Connected</span>
              {org.email ? ` · ${org.email}` : ""}
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
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void connect();
          }}
        >
          <div>
            <label className="block text-xs text-slate-500" htmlFor="icloud-email">
              iCloud email
            </label>
            <input
              id="icloud-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@icloud.com"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500" htmlFor="icloud-app-password">
              App-specific password
            </label>
            <input
              id="icloud-app-password"
              type="password"
              autoComplete="new-password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Create one at{" "}
              <a
                href="https://appleid.apple.com/account/manage"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                appleid.apple.com
              </a>{" "}
              → Sign-In and Security → App-Specific Passwords. Do not use your Apple ID password.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Connect iCloud"}
          </button>
        </form>
      )}
    </section>
  );
}
