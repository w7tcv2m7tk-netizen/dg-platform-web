"use client";

import { useEffect, useState } from "react";

type State = { configured: boolean; environment: "sandbox" | "live"; status: string; lastVerifiedAt: string | null; lastError: string | null; eligible?: boolean; requiredPlan?: string | null };

export function LendConnectorPanel() {
  const [state, setState] = useState<State | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/connectors/lend").then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setState(json.data);
        setEnvironment(json.data?.environment ?? "sandbox");
      }
    });
  }, []);

  async function disconnect() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/v1/connectors/lend", { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setState(json.data);
      setMessage("Lend disconnected. Stored connector credentials have been removed.");
    } else {
      setMessage(json.error?.message ?? "Could not disconnect Lend.");
    }
    setBusy(false);
  }

  async function connect() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/v1/connectors/lend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, apiSecret, environment }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setState(json.data);
      setApiKey("");
      setApiSecret("");
      setMessage("Lend connection verified.");
    } else {
      setMessage(json.error?.message ?? "Could not connect Lend.");
    }
    setBusy(false);
  }

  return (
    <section className="dg-card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Specialist integration</p>
        <h2 className="mt-1 font-semibold text-white">Lend</h2>
        <p className="mt-1 text-sm text-slate-400">
          Mortgage & finance broking connector. Link Lend to DigitalGate so broker workflow context can inform CRM, Finance and the Business Brain.
        </p>
      </div>
      {state?.configured ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-sm text-slate-300">
          Connected · {state.environment === "live" ? "Live" : "Sandbox"}
          {state.lastVerifiedAt ? <span className="text-slate-500"> · verified {new Date(state.lastVerifiedAt).toLocaleString()}</span> : null}
        </div>
      ) : null}
      {state && state.eligible === false ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
          <p className="font-medium text-white">Lend integration — Scale</p>
          <p className="mt-1 text-sm text-slate-400">Connect your existing Lend broker platform to DigitalGate to bring application and pipeline intelligence into your CRM, Finance workspace and Business Brain.</p>
          <a href="/dashboard/settings/billing" className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Upgrade to Scale</a>
        </div>
      ) : null}
      <div className={`grid gap-3 sm:grid-cols-2 ${state?.eligible === false ? "opacity-50" : ""}`}>
        <label className="text-sm text-slate-300">API key<input value={apiKey} onChange={(e)=>setApiKey(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>
        <label className="text-sm text-slate-300">API secret<input type="password" value={apiSecret} onChange={(e)=>setApiSecret(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>
      </div>
      <label className="block text-sm text-slate-300">Environment
        <select value={environment} onChange={(e)=>setEnvironment(e.target.value as "sandbox"|"live")} className="ml-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
          <option value="sandbox">Sandbox</option><option value="live">Live</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !apiKey || !apiSecret || state?.eligible === false} onClick={connect} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Verifying…" : state?.configured ? "Replace credentials" : "Verify & connect"}</button>
        {state?.configured ? <button type="button" disabled={busy} onClick={disconnect} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-50">Disconnect</button> : null}
        <span className="text-xs text-slate-500">Use sandbox first. Credentials are never returned to the browser after saving.</span>
      </div>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </section>
  );
}
