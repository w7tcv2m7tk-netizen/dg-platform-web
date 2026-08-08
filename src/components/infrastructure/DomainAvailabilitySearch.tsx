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
  env?: {
    hasKey?: boolean;
    hasResellerId?: boolean;
    hasBaseUrl?: boolean;
    sendResellerId?: boolean;
    keyLength?: number;
  };
  error?: {
    code?: string;
    message?: string;
    hint?: string;
    providerBodySnippet?: string;
    debug?: {
      path?: string;
      method?: string;
      headersSent?: string[];
      resellerIdHeadersSent?: string[];
      queryKeysSent?: string[];
      hasResellerIdQuery?: boolean;
      sendResellerId?: boolean;
      signatureAlgo?: string;
      isSandbox?: boolean;
    };
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
      const debug =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("debug") === "1";
      const params = new URLSearchParams({ q });
      if (debug) params.set("debug", "1");
      const res = await fetch(
        `/api/v1/infrastructure/domains/availability?${params.toString()}`,
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
              {result.error.code === "provider_not_configured" && result.env ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-200/70">
                  <li>
                    DREAMSCAPE_API_KEY:{" "}
                    {result.env.hasKey
                      ? `present (length ${result.env.keyLength ?? "?"})`
                      : "missing (length 0)"}
                  </li>
                  <li>
                    DREAMSCAPE_API_BASE_URL:{" "}
                    {result.env.hasBaseUrl
                      ? "set"
                      : "unset (defaults to sandbox)"}
                  </li>
                  <li>
                    Reseller ID opt-in:{" "}
                    {result.env.sendResellerId
                      ? "on (DREAMSCAPE_SEND_RESELLER_ID)"
                      : "off (official auth only)"}
                    {result.env.hasResellerId ? " · ID present" : ""}
                  </li>
                </ul>
              ) : null}
              {result.error.code?.startsWith("auth_") ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-200/70">
                  <li>
                    Default auth is official only: Accept + Api-Request-Id +
                    Api-Signature (md5(request_id + api_key)). Reseller ID is
                    not sent unless DREAMSCAPE_SEND_RESELLER_ID=true.
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
                  <li>
                    Staff: append ?debug=1 to this page URL for header names +
                    provider response snippet.
                  </li>
                </ul>
              ) : null}
              {result.error.providerBodySnippet ? (
                <p className="mt-2 break-all font-mono text-xs text-amber-200/60">
                  Provider: {result.error.providerBodySnippet}
                </p>
              ) : null}
              {result.error.debug ? (
                <pre className="mt-2 overflow-x-auto rounded border border-amber-500/20 bg-black/30 p-2 font-mono text-[11px] text-amber-100/80">
                  {JSON.stringify(result.error.debug, null, 2)}
                </pre>
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
