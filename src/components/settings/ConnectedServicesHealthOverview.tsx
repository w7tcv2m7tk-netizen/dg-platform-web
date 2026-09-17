"use client";

import { useEffect, useMemo, useState } from "react";

type HealthState = "connected" | "attention" | "not_connected" | "available";
type Maturity = "native" | "available" | "planned";

type CatalogConnector = {
  manifest: { id: string; name: string; maturity: Maturity };
  connectionScope: "platform" | "organisation";
  platformConfigured: boolean;
  organisation?: {
    status?: string;
    connectedAt?: string | null;
    lastError?: string | null;
    lastSyncAt?: string | null;
  };
  health?: { status?: string; lastError?: string | null };
};

type ConnectionHealth = { id: string; name: string; state: HealthState };

const STATUS = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-300" },
  attention: { label: "Needs attention", dot: "bg-amber-400", text: "text-amber-300" },
  not_connected: { label: "Not connected", dot: "bg-red-400", text: "text-red-300" },
  available: { label: "Available", dot: "bg-slate-300", text: "text-slate-300" },
} as const;

function stateFromConnector(connector: CatalogConnector): HealthState | null {
  if (connector.manifest.maturity === "planned") return null;
  if (connector.connectionScope !== "organisation") return null;

  const status = connector.organisation?.status;
  if (status === "connected") {
    if (connector.organisation?.lastError || connector.health?.lastError || connector.health?.status === "degraded" || connector.health?.status === "error") return "attention";
    return "connected";
  }
  if (status === "pending_auth" || status === "degraded" || status === "error") return "attention";

  // Optional supported bridges/integrations are white, never red by default.
  if (connector.manifest.maturity === "available") return "available";

  // A native connector can only be offered when its platform-side configuration exists.
  // Missing provider configuration is not an organisation failure.
  if (!connector.platformConfigured) return "available";

  return "not_connected";
}

export function ConnectedServicesHealthOverview() {
  const [connections, setConnections] = useState<ConnectionHealth[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/v1/connectors", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load connector catalogue");
        const json = await response.json();
        const connectors: CatalogConnector[] = json?.data?.connectors ?? [];
        const mapped = connectors.flatMap((connector) => {
          const state = stateFromConnector(connector);
          return state ? [{ id: connector.manifest.id, name: connector.manifest.name, state }] : [];
        });
        if (!cancelled) setConnections(mapped);
      } catch {
        if (!cancelled) setConnections([]);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const initial = { connected: 0, attention: 0, not_connected: 0, available: 0 };
    return (connections ?? []).reduce((acc, connection) => { acc[connection.state] += 1; return acc; }, initial);
  }, [connections]);

  if (!connections) return <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><p className="text-sm text-slate-400">Checking connection health…</p></section>;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your connected business</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Connection health</h2>
          <p className="mt-1 text-sm text-slate-400">Live organisation connection health from the DigitalGate Connector Engine.</p>
        </div>
        <p className="text-sm text-slate-400">{connections.length} services shown</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["connected", "attention", "not_connected", "available"] as const).map((state) => (
          <div key={state} className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${STATUS[state].dot}`} /><span className={`text-sm font-medium ${STATUS[state].text}`}>{STATUS[state].label}</span></div>
            <p className="mt-2 text-2xl font-semibold text-white">{counts[state]}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-800 pt-4">
        {connections.map((connection) => <div key={connection.id} className="flex items-center gap-2 text-xs text-slate-300"><span className={`h-2 w-2 rounded-full ${STATUS[connection.state].dot}`} /><span>{connection.name}</span></div>)}
      </div>
      <p className="mt-4 text-xs text-slate-500">Green means healthy and connected. Orange means action is required. Red means a configured native service is not connected. White means an optional or not-yet-configured integration is available. Planned integrations are excluded from health and are never treated as failures.</p>
    </section>
  );
}
