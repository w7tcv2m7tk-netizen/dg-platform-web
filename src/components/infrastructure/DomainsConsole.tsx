"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type AvailabilityRow = {
  domain: string;
  available: boolean;
  premium?: boolean;
  priceCents?: number;
  currency?: string;
};

type InventoryDomain = {
  id: string;
  name: string;
  status: string;
  source: string;
  managed: boolean;
  websiteId: string | null;
  dnsConfiguredAt: string | null;
  sslState: string;
};

type AvailabilityResponse = {
  configured?: boolean;
  isSandbox?: boolean;
  apiMode?: "soap" | "rest";
  soapHost?: string;
  soapEnv?: string;
  data?: AvailabilityRow[];
  env?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
    providerBodySnippet?: string;
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

export function DomainsConsole() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AvailabilityResponse | null>(null);
  const [inventory, setInventory] = useState<InventoryDomain[]>([]);
  const [isSandbox, setIsSandbox] = useState(true);
  const [registerTarget, setRegisterTarget] = useState<string | null>(null);
  const [confirmDomain, setConfirmDomain] = useState("");
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [connectName, setConnectName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshInventory = useCallback(async () => {
    const res = await fetch("/api/v1/infrastructure/domains");
    const json = (await res.json()) as {
      data?: InventoryDomain[];
      provider?: { isSandbox?: boolean };
    };
    setInventory(json.data ?? []);
    if (json.provider?.isSandbox != null) setIsSandbox(json.provider.isSandbox);
  }, []);

  useEffect(() => {
    void refreshInventory();
  }, [refreshInventory]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ q });
      const res = await fetch(
        `/api/v1/infrastructure/domains/availability?${params}`,
      );
      setResult((await res.json()) as AvailabilityResponse);
    } catch (err) {
      setResult({
        error: {
          code: "client_error",
          message: err instanceof Error ? err.message : "Request failed",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function registerDomain() {
    if (!registerTarget) return;
    setBusy(true);
    setStatus("Registering…");
    const res = await fetch("/api/v1/infrastructure/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        domain: registerTarget,
        confirmDomain,
        confirmProduction: !isSandbox ? confirmProduction : undefined,
        periodMonths: 12,
      }),
    });
    const json = (await res.json()) as {
      data?: InventoryDomain;
      warning?: string;
      error?: { message?: string; code?: string };
    };
    if (res.ok && json.data) {
      setStatus(json.warning || `Registered ${json.data.name}`);
      setRegisterTarget(null);
      setConfirmDomain("");
      setConfirmProduction(false);
      await refreshInventory();
    } else {
      setStatus(json.error?.message || "Registration blocked or failed");
    }
    setBusy(false);
  }

  async function connectDomain(e: FormEvent) {
    e.preventDefault();
    const domain = connectName.trim().toLowerCase();
    if (!domain) return;
    setBusy(true);
    const res = await fetch("/api/v1/infrastructure/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", domain, managed: true }),
    });
    const json = (await res.json()) as {
      data?: InventoryDomain;
      error?: { message?: string };
    };
    if (res.ok) {
      setStatus(`Connected ${domain} — configure DNS next`);
      setConnectName("");
      await refreshInventory();
    } else {
      setStatus(json.error?.message || "Connect failed");
    }
    setBusy(false);
  }

  async function applyHostingDns(domainId: string) {
    setBusy(true);
    setStatus("Applying hosting DNS…");
    const res = await fetch(`/api/v1/infrastructure/domains/${domainId}/dns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyHosting: true, attachVercel: true }),
    });
    const json = (await res.json()) as {
      error?: { message?: string; hint?: string; code?: string };
      data?: {
        instructions?: string[] | null;
        vercel?: {
          ok?: boolean;
          configured?: boolean;
          message?: string;
          verified?: boolean | null;
        } | null;
        domain?: InventoryDomain;
      };
    };
    if (res.ok) {
      const parts: string[] = [];
      if (json.data?.instructions?.length) {
        parts.push(...json.data.instructions);
      } else {
        parts.push("Hosting DNS applied at the registrar.");
      }
      const vercel = json.data?.vercel;
      if (vercel) {
        if (vercel.ok) {
          parts.push(
            vercel.verified === false
              ? "Vercel hostname attached — SSL pending until DNS verifies (can take minutes)."
              : "Vercel hostname attached — SSL will provision automatically.",
          );
        } else if (!vercel.configured) {
          parts.push(
            vercel.message ||
              "Vercel attach skipped — set VERCEL_TOKEN + VERCEL_PROJECT_ID, or add the domain manually in Vercel → Domains. SSL stays pending until then.",
          );
        } else {
          parts.push(
            `Vercel attach failed: ${vercel.message || "unknown error"}. SSL stays pending — fix attach or add hostname manually.`,
          );
        }
      }
      const ssl = json.data?.domain?.sslState;
      if (ssl === "pending") {
        parts.push("SSL state: pending (normal until DNS propagates).");
      }
      setStatus(parts.join(" · "));
      await refreshInventory();
    } else {
      const msg = json.error?.message || "DNS apply failed";
      setStatus(
        json.error?.hint ? `${msg} — ${json.error.hint}` : msg,
      );
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">Domain search</h2>
        <p className="mt-1 text-sm text-slate-400">
          DigitalGate Domains · availability. Registration is gated by flag{" "}
          <code className="text-slate-300">infra.domain_register</code> and a
          typed confirm{!isSandbox ? " (+ production confirm)" : ""}.
        </p>
        {result?.soapHost || result?.apiMode ? (
          <p className="mt-2 text-[11px] text-slate-500">
            {result.apiMode?.toUpperCase() ?? "SOAP"}
            {result.soapHost ? ` · ${result.soapHost}` : ""}
            {result.soapEnv ? ` (${result.soapEnv})` : ""}
            {result.isSandbox != null
              ? result.isSandbox
                ? " · sandbox"
                : " · production"
              : ""}
          </p>
        ) : null}
        <form onSubmit={onSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
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
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Check availability"}
          </button>
        </form>

        {result?.error ? (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <p className="font-medium">{result.error.message}</p>
            {result.error.hint ? (
              <p className="mt-1 text-xs text-amber-200/70">{result.error.hint}</p>
            ) : null}
          </div>
        ) : null}

        {result?.configured && result.data && result.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-800 rounded-md border border-slate-800">
            {result.data.map((row) => (
              <li
                key={row.domain}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <span className="font-mono text-slate-200">{row.domain}</span>
                <span className="flex items-center gap-2">
                  {formatPrice(row) ? (
                    <span className="text-xs text-slate-400">{formatPrice(row)}</span>
                  ) : null}
                  <span
                    className={
                      row.available
                        ? "rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
                        : "rounded bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300"
                    }
                  >
                    {row.available ? "Available" : "Unavailable"}
                  </span>
                  {row.available ? (
                    <button
                      type="button"
                      className="rounded-md border border-amber-600/50 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
                      onClick={() => {
                        setRegisterTarget(row.domain);
                        setConfirmDomain("");
                        setConfirmProduction(false);
                      }}
                    >
                      Register…
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {registerTarget ? (
          <div className="mt-4 space-y-3 rounded-md border border-rose-500/40 bg-rose-950/30 p-4">
            <p className="text-sm font-medium text-rose-100">
              Confirm registration of{" "}
              <span className="font-mono">{registerTarget}</span>
            </p>
            <p className="text-xs text-rose-200/80">
              {isSandbox
                ? "Sandbox — still requires org flag infra.domain_register."
                : "PRODUCTION — may charge the reseller account. Enable flag + confirmProduction."}
            </p>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
              placeholder="Type the domain exactly"
              value={confirmDomain}
              onChange={(e) => setConfirmDomain(e.target.value)}
            />
            {!isSandbox ? (
              <label className="flex items-center gap-2 text-xs text-rose-100">
                <input
                  type="checkbox"
                  checked={confirmProduction}
                  onChange={(e) => setConfirmProduction(e.target.checked)}
                />
                I understand this is a paid production registration
              </label>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void registerDomain()}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Register domain
              </button>
              <button
                type="button"
                onClick={() => setRegisterTarget(null)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">Connect existing domain</h2>
        <p className="mt-1 text-sm text-slate-400">
          Mark a domain as managed and start DNS / go-live instructions.
        </p>
        <form onSubmit={connectDomain} className="mt-4 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="yourdomain.com.au"
            value={connectName}
            onChange={(e) => setConnectName(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !connectName.trim()}
            className="rounded-md border border-slate-500 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Connect
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
        <h2 className="text-lg font-semibold text-white">Your domains</h2>
        {status ? (
          <p className="mt-2 text-xs text-slate-400">{status}</p>
        ) : null}
        {inventory.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No domains yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 rounded-md border border-slate-800">
            {inventory.map((d) => (
              <li key={d.id} className="px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-slate-200">{d.name}</span>
                  <span className="text-xs text-slate-500">
                    {d.status} · {d.source}
                    {d.dnsConfiguredAt ? " · DNS set" : ""}
                    {d.sslState !== "unknown" ? ` · SSL ${d.sslState}` : ""}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyHostingDns(d.id)}
                    className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Apply website DNS
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
