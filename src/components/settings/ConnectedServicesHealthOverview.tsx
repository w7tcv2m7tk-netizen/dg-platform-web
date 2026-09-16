"use client";

import { useEffect, useMemo, useState } from "react";

type HealthState = "connected" | "attention" | "not_connected";

type ConnectionHealth = {
  id: string;
  name: string;
  state: HealthState;
};

function stateFromOrganisation(organisation: any): HealthState {
  if (!organisation?.connected) return "not_connected";
  const health = organisation?.health;
  if (health?.error || health?.lastError || health?.status === "error" || health?.status === "attention") {
    return "attention";
  }
  return "connected";
}

const STATUS = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-300" },
  attention: { label: "Needs attention", dot: "bg-amber-400", text: "text-amber-300" },
  not_connected: { label: "Not connected", dot: "bg-red-400", text: "text-red-300" },
} as const;

export function ConnectedServicesHealthOverview() {
  const [connections, setConnections] = useState<ConnectionHealth[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const endpoints = [
        ["google-workspace", "Google Workspace / Gmail", "/api/v1/connectors/google-gmail/status"],
        ["google-business-profile", "Google Business Profile", "/api/v1/connectors/google/status"],
        ["microsoft-365", "Microsoft 365 / Outlook", "/api/v1/connectors/microsoft-365/status"],
        ["apple-icloud", "Apple iCloud Mail", "/api/v1/connectors/apple-icloud/status"],
        ["linkedin", "LinkedIn", "/api/v1/connectors/linkedin/status"],
      ] as const;

      const results = await Promise.all(
        endpoints.map(async ([id, name, endpoint]) => {
          try {
            const response = await fetch(endpoint);
            if (!response.ok) return { id, name, state: "attention" as const };
            const json = await response.json().catch(() => ({}));
            return { id, name, state: stateFromOrganisation(json?.data?.organisation) };
          } catch {
            return { id, name, state: "attention" as const };
          }
        }),
      );
      if (!cancelled) setConnections(results);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const initial = { connected: 0, attention: 0, not_connected: 0 };
    return (connections ?? []).reduce((acc, connection) => {
      acc[connection.state] += 1;
      return acc;
    }, initial);
  }, [connections]);

  if (!connections) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <p className="text-sm text-slate-400">Checking connection health…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your connected business</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Connection health</h2>
          <p className="mt-1 text-sm text-slate-400">A live overview of the services DigitalGate can currently verify for this organisation.</p>
        </div>
        <p className="text-sm text-slate-400">{connections.length} services checked</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(["connected", "attention", "not_connected"] as const).map((state) => (
          <div key={state} className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS[state].dot}`} aria-hidden="true" />
              <span className={`text-sm font-medium ${STATUS[state].text}`}>{STATUS[state].label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{counts[state]}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-800 pt-4">
        {connections.map((connection) => (
          <div key={connection.id} className="flex items-center gap-2 text-xs text-slate-300">
            <span className={`h-2 w-2 rounded-full ${STATUS[connection.state].dot}`} aria-hidden="true" />
            <span>{connection.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Green means healthy and connected. Orange means DigitalGate cannot confirm a healthy connection or action is required. Red means the service is not connected to this organisation. Optional and planned integrations are not treated as failures.</p>
    </section>
  );
}
