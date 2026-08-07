"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WordPressConnectorPanel({
  initial,
}: {
  initial: {
    baseUrl: string;
    label: string;
    hasApiKey: boolean;
    resolvedLabel: string;
    resolvedBaseUrl: string;
    source: "org" | "env" | "preset";
  };
}) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || initial.resolvedBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState(initial.label || initial.resolvedLabel);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceLabel =
    initial.source === "org"
      ? "org override active"
      : initial.source === "preset"
        ? "using brand preset"
        : "currently using env";

  async function save(preset?: "digitalgate" | "real-estate" | "accommodation" | "creator") {
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/connectors/wordpress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset,
        baseUrl: baseUrl.trim(),
        label: label.trim(),
        apiKey: apiKey.trim() || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save connector");
      return;
    }
    setApiKey("");
    setMessage("WordPress connector saved for this business.");
    router.refresh();
  }

  async function testConnection() {
    setPending(true);
    setError(null);
    setMessage(null);
    await save();
    const res = await fetch("/api/v1/connectors/wordpress");
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (json.data?.probe?.ok) {
      setMessage(json.data.probe.detail ?? "Connected");
    } else {
      setError(json.data?.probe?.message ?? "Connection test failed");
    }
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">WordPress connector (this business)</h2>
      <p className="mt-2 text-sm text-slate-400">
        Each organisation can point at its own WordPress site. API keys are stored per
        business; leave blank to use deployment env vars (
        {sourceLabel}).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => save("digitalgate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          DigitalGate preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save("real-estate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          Roe Realty preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save("accommodation")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          CVH preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save("creator")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          Aëtherra preset
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-slate-400">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">REST base URL</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://yoursite.com.au/wp-json/digitalgate/v1"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">
            Dev API key {initial.hasApiKey ? "(saved — enter to replace)" : "(optional)"}
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="dgdev_… from WP → DG Platform → API Settings"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => save()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save connector"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={testConnection}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
        >
          Test connection
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
