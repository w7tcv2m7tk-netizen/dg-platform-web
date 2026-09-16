"use client";

import { useEffect, useMemo, useState } from "react";

type GbpLocation = {
  name: string;
  title?: string | null;
  storeCode?: string | null;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  } | null;
};

type LocationResponse = {
  data?: {
    availableLocations?: GbpLocation[];
    selectedLocationNames?: string[];
  };
  error?: { message?: string };
};

function locationLabel(location: GbpLocation) {
  return location.title || location.storeCode || location.name.split("/").pop() || "Business Profile location";
}

function locationAddress(location: GbpLocation) {
  const address = location.storefrontAddress;
  if (!address) return null;
  return [address.addressLines?.join(" "), address.locality, address.administrativeArea, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

export function GoogleBusinessProfileLocationSelector() {
  const [locations, setLocations] = useState<GbpLocation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialSelected, setInitialSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/connectors/google/locations", { cache: "no-store" });
      if (response.status === 404) {
        setConnected(false);
        return;
      }
      const json = (await response.json().catch(() => ({}))) as LocationResponse;
      if (!response.ok) throw new Error(json.error?.message || "Could not load Business Profile locations.");
      const available = json.data?.availableLocations ?? [];
      const current = json.data?.selectedLocationNames ?? [];
      setConnected(true);
      setLocations(available);
      setSelected(current);
      setInitialSelected(current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Business Profile locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dirty = useMemo(
    () => [...selected].sort().join("|") !== [...initialSelected].sort().join("|"),
    [selected, initialSelected],
  );

  function toggle(name: string) {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/connectors/google/locations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locationNames: selected }),
      });
      const json = (await response.json().catch(() => ({}))) as LocationResponse;
      if (!response.ok) throw new Error(json.error?.message || "Could not save Business Profile locations.");
      setInitialSelected(selected);
      setMessage(selected.length
        ? `${selected.length} Business Profile location${selected.length === 1 ? "" : "s"} assigned to this organisation and synced.`
        : "No Business Profile locations are assigned to this organisation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save Business Profile locations.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">Checking Google Business Profile locations…</div>;
  }
  if (!connected) return null;

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Google Business Profile locations</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Choose only the Business Profile locations that belong to this organisation. Other locations available to your Google login stay separate and will not feed this business&apos;s Reputation, Advisor or intelligence.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="text-xs font-medium text-sky-400 hover:underline">Refresh locations</button>
      </div>

      {locations.length ? (
        <div className="mt-4 space-y-2">
          {locations.map((location) => {
            const checked = selected.includes(location.name);
            const address = locationAddress(location);
            return (
              <label key={location.name} className="flex cursor-pointer gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700">
                <input type="checkbox" checked={checked} onChange={() => toggle(location.name)} className="mt-1 h-4 w-4" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-100">{locationLabel(location)}</span>
                  {address ? <span className="mt-0.5 block text-xs text-slate-500">{address}</span> : null}
                  <span className="mt-1 block text-[11px] text-slate-600">{checked ? "Assigned to this organisation" : "Not assigned"}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-200">Google is connected, but no Business Profile locations are currently available to this login.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving & syncing…" : "Save locations & sync"}
        </button>
        <span className="text-xs text-slate-500">{selected.length} selected</span>
      </div>
      {message ? <p className="mt-3 text-xs text-slate-300">{message}</p> : null}
    </section>
  );
}
