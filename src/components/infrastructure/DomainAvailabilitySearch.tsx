"use client";

import { useState, type FormEvent } from "react";

type AvailabilityRow = {
  domain: string;
  available: boolean;
  premium?: boolean;
  priceCents?: number;
  currency?: string;
};

type AvailabilityResponse = {
  configured?: boolean;
  isSandbox?: boolean;
  baseUrl?: string;
  data?: AvailabilityRow[];
  error?: {
    code?: string;
    message?: string;
    hint?: string;
  };
};

function formatPrice(row: AvailabilityRow) {
  if (row.priceCents == null) return null;
  const currency = row.currency ?? "AUD";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
    }).format(row.priceCents / 100);
  } catch {
    return `${(row.priceCents / 100).toFixed(2)} ${currency}`;
  }
}

/** Internal scaffold — DigitalGate Domains availability (provider hidden from UX). */
export function DomainAvailabilitySearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AvailabilityResponse | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/v1/infrastructure/domains/availability?q=${encodeURIComponent(q)}`,
      );
      const json = (await res.json()) as AvailabilityResponse;
      setResult(json);
    } catch (err) {
      setResult({
        configured: false,
        data: [],
        error: {
          code: "client_error",
          message: err instanceof Error ? err.message : "Request failed",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 max-w-xl rounded-lg border border-slate-800 bg-slate-950/60 p-5">
      <h2 className="text-lg font-semibold text-white">Domain search</h2>
      <p className="mt-1 text-sm text-slate-400">
        DigitalGate Domains · availability check (sandbox). Purchase, DNS, and SSL
        follow the unified provisioning path after Website Builder publish.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="example.com.au"
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check availability"}
        </button>
      </form>

      {result ? (
        <div className="mt-4 space-y-3 text-sm">
          {result.error ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100">
              <p className="font-medium">
                {result.error.code === "provider_not_configured"
                  ? "Not configured"
                  : result.error.code?.startsWith("auth_")
                    ? "API authentication failed"
                    : "Availability check"}
              </p>
              <p className="mt-1 text-amber-100/90">{result.error.message}</p>
              {result.error.hint ? (
                <p className="mt-1 text-xs text-amber-200/70">{result.error.hint}</p>
              ) : null}
              {result.error.code?.startsWith("auth_") ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-200/70">
                  <li>
                    Set DREAMSCAPE_RESELLER_ID (e.g. 25735) — required alongside
                    the API key per Dreamscape support.
                  </li>
                  <li>
                    Sandbox key must come from reseller.sandbox.ds.network (prod
                    keys 401 on sandbox). If a key was exposed in chat, regenerate
                    it immediately.
                  </li>
                  <li>
                    Sandbox: no IP whitelist (IP is a red herring). Production:
                    whitelist a stable egress IP if needed (Vercel Static IPs or
                    DREAMSCAPE_HTTPS_PROXY).
                  </li>
                </ul>
              ) : null}
              {result.isSandbox != null ? (
                <p className="mt-1 text-xs text-slate-400">
                  {result.isSandbox ? "Sandbox API" : "Production API"} ·{" "}
                  {result.baseUrl}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.configured && result.data && result.data.length > 0 ? (
            <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
              {result.data.map((row) => (
                <li
                  key={row.domain}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="font-mono text-slate-200">{row.domain}</span>
                  <span className="flex items-center gap-2">
                    {formatPrice(row) ? (
                      <span className="text-xs text-slate-400">{formatPrice(row)}</span>
                    ) : null}
                    <span
                      className={
                        row.available
                          ? "rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300"
                          : "rounded bg-slate-700/60 px-2 py-0.5 text-xs font-medium text-slate-300"
                      }
                    >
                      {row.available ? "Available" : "Unavailable"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
