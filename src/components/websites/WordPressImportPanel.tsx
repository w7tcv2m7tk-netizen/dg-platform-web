"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SerializedWebsite } from "@dg/platform-core";

type ConnectorStatus = {
  connectorBaseUrl?: string;
  label?: string;
  source?: string;
  env?: { hasEffectiveKey?: boolean };
  probe?: { ok?: boolean; message?: string; leadCount?: number };
};

type WpImportMeta = {
  status?: string;
  note?: string;
  queuedAt?: string;
  steps?: string[];
};

function readWpImport(website: SerializedWebsite): WpImportMeta {
  const meta = website.metadata ?? {};
  const raw = meta.wpImport;
  if (raw && typeof raw === "object") return raw as WpImportMeta;
  return { status: "not_started" };
}

export function WordPressImportPanel({
  website,
  onQueued,
}: {
  website: SerializedWebsite;
  onQueued?: (next: SerializedWebsite) => void;
}) {
  const [connector, setConnector] = useState<ConnectorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const wp = readWpImport(website);
  const queued = wp.status === "queued" || wp.status === "coming_soon";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/connectors/wordpress/status");
        const json = (await res.json()) as { data?: ConnectorStatus };
        if (!cancelled) setConnector(json.data ?? null);
      } catch {
        if (!cancelled) setConnector(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function queueImport() {
    setBusy(true);
    setStatus("Queuing interest…");
    const res = await fetch(`/api/v1/websites/${website.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: {
          wpImport: {
            status: "queued",
            note: "Queue-only — full WordPress → Gen 2 mapper is coming soon (Connector migration phases 2–4). Nothing is imported yet.",
            queuedAt: new Date().toISOString(),
            steps: [
              "connect_wordpress",
              "map_pages",
              "draft_components",
            ],
          },
        },
      }),
    });
    const json = (await res.json()) as {
      data?: SerializedWebsite;
      error?: { message?: string };
    };
    if (json.data) {
      onQueued?.(json.data);
      setStatus(
        "Queued — interest recorded. Full page mapping is not available yet.",
      );
    } else {
      setStatus(json.error?.message || "Could not queue import");
    }
    setBusy(false);
  }

  const connected =
    Boolean(connector?.env?.hasEffectiveKey) &&
    Boolean(connector?.probe?.ok || connector?.connectorBaseUrl);

  return (
    <div className="max-w-2xl space-y-4 rounded-md border border-slate-700 bg-slate-950/60 p-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-white">
            Import from WordPress
          </h2>
          <span className="rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[11px] font-medium text-amber-200">
            Queue only · coming soon
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          This flow records interest and checks your{" "}
          <strong className="font-medium text-slate-300">WordPress Connector</strong>
          . It does <strong className="font-medium text-slate-300">not</strong> run
          a full site mapper yet — no pages or media are copied into Gen 2 today.
        </p>
      </div>

      <div className="rounded-md border border-amber-900/50 bg-amber-950/25 px-3 py-2.5 text-xs text-amber-100/90">
        <strong className="font-medium text-amber-100">Coming soon:</strong> map
        WP pages/posts into typed components and draft Studio pages. Until then,
        build Gen 2 sites from Business Profile or Funnel templates.
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Connector status
        </p>
        {loading ? (
          <p className="text-sm text-slate-400">Checking…</p>
        ) : connector ? (
          <>
            <p className="text-sm text-slate-200">
              {connector.label || "WordPress"} ·{" "}
              <span
                className={
                  connected ? "text-emerald-300" : "text-amber-200"
                }
              >
                {connected ? "reachable" : "needs setup"}
              </span>
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              {connector.connectorBaseUrl}
            </p>
            {connector.probe && !connector.probe.ok ? (
              <p className="text-xs text-amber-200/90">
                {connector.probe.message || "Probe failed — check API key"}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Could not load connector status.
          </p>
        )}
        <Link
          href="/dashboard/settings/connectors"
          className="inline-block text-sm text-sky-400 hover:underline pt-1"
        >
          Open connector settings →
        </Link>
      </div>

      <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
        <li>
          Connect WordPress (base URL + Dev API key) in Settings → Connectors
        </li>
        <li>
          Queue interest below (records intent — does not import content)
        </li>
        <li>
          When the mapper ships: review draft pages in Studio — never treat HTML
          dumps as source of truth
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || queued}
          onClick={() => void queueImport()}
          className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {queued ? "Interest queued" : "Queue interest (coming soon)"}
        </button>
        {wp.queuedAt ? (
          <span className="text-xs text-slate-500">
            Queued {new Date(wp.queuedAt).toLocaleString("en-AU")}
          </span>
        ) : null}
      </div>

      {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      {wp.note && !status ? (
        <p className="text-xs text-slate-500">{wp.note}</p>
      ) : null}
    </div>
  );
}
