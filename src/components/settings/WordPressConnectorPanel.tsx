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

  const isCvh =
    /currumbinvalleyhideaway/i.test(baseUrl) ||
    /hideaway|cvh/i.test(label);

  async function save(
    preset?: "digitalgate" | "real-estate" | "accommodation" | "creator",
    options?: { requireKey?: boolean },
  ) {
    setPending(true);
    setError(null);
    setMessage(null);

    const nextPresetUrl = preset
      ? {
          digitalgate: "https://digitalgate.com.au/wp-json/digitalgate/v1",
          "real-estate": "https://roerealty.com.au/wp-json/digitalgate/v1",
          accommodation:
            "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1",
          creator: "https://aetherra.com.au/wp-json/digitalgate/v1",
        }[preset]
      : null;

    const effectiveUrl = (nextPresetUrl || baseUrl).trim();
    const needsCvhKey =
      options?.requireKey ||
      /currumbinvalleyhideaway/i.test(effectiveUrl) ||
      preset === "accommodation";

    if (needsCvhKey && !apiKey.trim() && !initial.hasApiKey) {
      setPending(false);
      setError(
        "Paste the CVH Dev API key before saving. Settings → Connectors stores it per business — the Roe/DigitalGate env key is never sent to CVH.",
      );
      return null;
    }

    const res = await fetch("/api/v1/connectors/wordpress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset,
        baseUrl: baseUrl.trim(),
        label: label.trim(),
        apiKey: apiKey.trim() || undefined,
        probe: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save connector");
      return null;
    }

    if (preset === "accommodation" || nextPresetUrl) {
      setBaseUrl(json.data?.baseUrl || nextPresetUrl || baseUrl);
      if (json.data?.label) setLabel(json.data.label);
    }

    setApiKey("");
    const probe = json.data?.probe;
    if (probe?.ok) {
      setMessage(probe.detail ?? "WordPress connector saved and connected.");
    } else if (probe && !probe.ok) {
      setError(probe.message ?? "Saved, but connection test failed");
      setMessage(
        json.data?.hasApiKey
          ? "Connector saved — fix the API key and test again."
          : "Connector URL saved — paste the CVH API key and Save again.",
      );
    } else {
      setMessage("WordPress connector saved for this business.");
    }
    router.refresh();
    return json.data;
  }

  async function testConnection() {
    await save(undefined, { requireKey: isCvh });
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">WordPress connector (this business)</h2>
      <p className="mt-2 text-sm text-slate-400">
        Each organisation can point at its own WordPress site. API keys are stored per
        business; leave blank to keep the saved key ({sourceLabel}).
        {isCvh ? (
          <>
            {" "}
            <span className="text-amber-300/90">
              CVH requires its own key from currumbinvalleyhideaway.com.au — never reuse Roe
              or DigitalGate.
            </span>
          </>
        ) : null}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void save("digitalgate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          DigitalGate preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save("real-estate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          Roe Realty preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save("accommodation", { requireKey: true })}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          CVH preset
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void save("creator")}
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
            Dev API key {initial.hasApiKey ? "(saved — enter to replace)" : "(required for CVH)"}
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
          onClick={() => void save()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save connector"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void testConnection()}
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
