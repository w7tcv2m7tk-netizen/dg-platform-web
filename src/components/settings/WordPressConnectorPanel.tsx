"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url.replace(/\/wp-json.*/, "")).hostname;
  } catch {
    return null;
  }
}

function looksLikeDgApiKey(key: string): boolean {
  const t = key.trim();
  if (!t) return false;
  return /^dg(dev|live)?_[A-Za-z0-9]+/i.test(t) || t.length >= 16;
}

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
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceLabel =
    initial.source === "org"
      ? "org override active"
      : initial.source === "preset"
        ? "using brand preset"
        : "currently using env";

  const effectiveUrl = (baseUrl || initial.resolvedBaseUrl).trim();
  const host = useMemo(() => hostFromUrl(effectiveUrl), [effectiveUrl]);
  const isCvh =
    /currumbinvalleyhideaway/i.test(effectiveUrl) ||
    /hideaway|cvh/i.test(label);

  const keyHint = useMemo(() => {
    if (!host) return null;
    if (isCvh) {
      return "This host is CVH — paste the Currumbin Valley Hideaway Dev API key only. Roe/DigitalGate keys are never sent here.";
    }
    if (initial.source === "env" && !initial.hasApiKey) {
      return `Using deployment env key only when env base URL host matches ${host}. For multi-site orgs, paste this site's own key.`;
    }
    return `API key must match the WordPress site at ${host} (DG Platform → API Settings).`;
  }, [host, isCvh, initial.hasApiKey, initial.source]);

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

    const nextUrl = (nextPresetUrl || baseUrl).trim();
    const needsSiteKey =
      options?.requireKey ||
      /currumbinvalleyhideaway/i.test(nextUrl) ||
      preset === "accommodation";

    if (needsSiteKey && !apiKey.trim() && !initial.hasApiKey) {
      setPending(false);
      setError(
        "Paste this site's Dev API key before saving. Settings → Connectors stores keys per business — never reuse Roe/DigitalGate keys on CVH or other hosts.",
      );
      return null;
    }

    if (apiKey.trim() && !looksLikeDgApiKey(apiKey)) {
      setPending(false);
      setError(
        "That doesn't look like a DigitalGate Dev API key (expected dgdev_… from WP → DG Platform → API Settings).",
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
          ? "Connector saved — fix the API key for this site and Test again."
          : "Connector URL saved — paste this site's API key and Save again.",
      );
    } else {
      setMessage("WordPress connector saved for this business.");
    }
    router.refresh();
    return json.data;
  }

  async function testConnection() {
    setTesting(true);
    setError(null);
    setMessage(null);

    if (apiKey.trim() && !looksLikeDgApiKey(apiKey)) {
      setTesting(false);
      setError(
        "That doesn't look like a DigitalGate Dev API key (expected dgdev_…).",
      );
      return;
    }

    // If a new key was typed, save+probe; otherwise GET status probe only
    if (apiKey.trim() || !initial.hasApiKey) {
      await save(undefined, { requireKey: isCvh || !initial.hasApiKey });
      setTesting(false);
      return;
    }

    const res = await fetch("/api/v1/connectors/wordpress", { method: "GET" });
    const json = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Connection test failed");
      return;
    }
    const probe = json.data?.probe;
    const resolvedHost = hostFromUrl(json.data?.resolved?.baseUrl || effectiveUrl);
    if (probe?.ok) {
      setMessage(
        `${probe.detail ?? "Connected"}${resolvedHost ? ` · ${resolvedHost}` : ""}`,
      );
    } else {
      setError(
        probe?.message ??
          `Could not reach WordPress${resolvedHost ? ` at ${resolvedHost}` : ""}.`,
      );
    }
    router.refresh();
  }

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">WordPress connector (this business)</h2>
      <p className="mt-2 text-sm text-slate-400">
        Each organisation points at its own WordPress site. Keys are stored per business
        ({sourceLabel}). Multi-site tip: the env fallback key only applies when the env
        base URL host matches this org&apos;s host — paste a site-specific key otherwise.
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

      {host ? (
        <p className="mt-3 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-300">
          Target host: <span className="text-white">{host}</span>
          {initial.hasApiKey ? " · org key saved" : " · no org key yet"}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || testing}
          onClick={() => void save("digitalgate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          DigitalGate preset
        </button>
        <button
          type="button"
          disabled={pending || testing}
          onClick={() => void save("real-estate")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          Roe Realty preset
        </button>
        <button
          type="button"
          disabled={pending || testing}
          onClick={() => void save("accommodation", { requireKey: true })}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-blue-500"
        >
          CVH preset
        </button>
        <button
          type="button"
          disabled={pending || testing}
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
            Site Dev API key{" "}
            {initial.hasApiKey ? "(saved — enter to replace)" : "(required per site)"}
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="dgdev_… from WP → DG Platform → API Settings"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
          />
          {keyHint ? (
            <span className="mt-1 block text-xs text-slate-500">{keyHint}</span>
          ) : null}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || testing}
          onClick={() => void save()}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save connector"}
        </button>
        <button
          type="button"
          disabled={pending || testing}
          onClick={() => void testConnection()}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 disabled:opacity-50"
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}
