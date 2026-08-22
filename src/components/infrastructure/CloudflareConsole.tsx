"use client";

import { useCallback, useState } from "react";

import type { CloudflareInfrastructureOverview } from "@dg/platform-core";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function CloudflareConsole({
  initialOverview,
}: {
  initialOverview: CloudflareInfrastructureOverview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/v1/infrastructure/cloudflare");
      const json = (await res.json()) as {
        data?: { overview?: CloudflareInfrastructureOverview };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus(json.error?.message || "Failed to refresh Cloudflare status");
        return;
      }
      if (json.data?.overview) setOverview(json.data.overview);
    } finally {
      setBusy(false);
    }
  }, []);

  async function purge(action: "purge_all" | "purge_urls") {
    setBusy(true);
    setStatus(null);
    try {
      const payload =
        action === "purge_urls"
          ? {
              action,
              urls: urls
                .split(/\n/)
                .map((line) => line.trim())
                .filter(Boolean),
            }
          : { action };

      const res = await fetch("/api/v1/infrastructure/cloudflare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: { message?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus(json.error?.message || "Purge failed");
        return;
      }
      setStatus(json.data?.message || "Cache purged");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const zone = overview.zone;
  const analytics = overview.analytics;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Connection</h2>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <p className="text-slate-300">
          API:{" "}
          {overview.configured ? (
            <span className="text-emerald-400">configured on this deployment</span>
          ) : (
            <span className="text-amber-300">not configured — add env vars in Vercel</span>
          )}
        </p>

        {overview.zoneId ? (
          <p className="text-slate-400">
            Zone ID: <code className="text-slate-300">{overview.zoneId}</code>
          </p>
        ) : null}

        {zone.zoneName ? (
          <dl className="grid gap-2 sm:grid-cols-3 text-slate-400">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Zone</dt>
              <dd className="text-slate-200">{zone.zoneName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Plan</dt>
              <dd className="text-slate-200">{zone.plan || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="text-slate-200">{zone.status || "—"}</dd>
            </div>
          </dl>
        ) : zone.message ? (
          <p className="text-slate-400">{zone.message}</p>
        ) : null}
      </section>

      {analytics.success ? (
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4">
          <h2 className="text-base font-semibold text-white mb-3">Edge traffic (7 days)</h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Requests</dt>
              <dd className="text-xl font-semibold text-white">
                {(analytics.requests ?? 0).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Bandwidth</dt>
              <dd className="text-xl font-semibold text-white">
                {formatBytes(analytics.bandwidthBytes ?? 0)}
              </dd>
            </div>
          </dl>
        </section>
      ) : overview.configured && analytics.message ? (
        <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          Analytics: {analytics.message}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-4">
        <h2 className="text-base font-semibold text-white">Cache purge</h2>
        <p className="text-sm text-slate-400">
          Purge Cloudflare edge cache after Design Studio publishes, pricing syncs, or WordPress
          deploys. Matches Site Tools → Cache on Roe/CVH WordPress sites.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !overview.configured}
            onClick={() => void purge("purge_all")}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Purge everything
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Purge specific URLs (one per line)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={4}
            placeholder={"https://digitalgate.com.au/pricing/\nhttps://digitalgate.com.au/apps/"}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <button
            type="button"
            disabled={busy || !overview.configured || !urls.trim()}
            onClick={() => void purge("purge_urls")}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Purge URLs
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4">
        <h2 className="text-base font-semibold text-white mb-2">Next steps</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          {overview.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      {status ? (
        <p className="text-sm text-slate-300 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
          {status}
        </p>
      ) : null}
    </div>
  );
}
