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
  importedAt?: string;
  source?: string;
  siteUrl?: string;
  siteName?: string;
  pageCount?: number;
  postCount?: number;
  limitations?: string[];
};

function readWpImport(website: SerializedWebsite): WpImportMeta {
  const meta = website.metadata ?? {};
  const raw = meta.wpImport;
  if (raw && typeof raw === "object") return raw as WpImportMeta;
  return { status: "not_started" };
}

export function WordPressImportPanel({
  website,
  onImported,
}: {
  website: SerializedWebsite;
  onImported?: (next: SerializedWebsite, summary?: string) => void;
  /** @deprecated use onImported */
  onQueued?: (next: SerializedWebsite) => void;
}) {
  const [connector, setConnector] = useState<ConnectorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [includePosts, setIncludePosts] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [limitations, setLimitations] = useState<string[]>([]);
  const wp = readWpImport(website);
  const alreadyImported = wp.status === "imported";

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

  useEffect(() => {
    if (Array.isArray(wp.limitations)) setLimitations(wp.limitations);
  }, [wp.limitations]);

  async function runImport() {
    setBusy(true);
    setError("");
    setStatus("Pulling WordPress pages…");
    try {
      const res = await fetch(
        `/api/v1/websites/${website.id}/import-wordpress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ includePosts }),
        },
      );
      const json = (await res.json()) as {
        data?: {
          website: SerializedWebsite;
          imported?: {
            pages?: number;
            posts?: number;
            source?: string;
            siteUrl?: string;
            limitations?: string[];
          };
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.website) {
        setError(json.error?.message || "Import failed");
        setStatus("");
        setBusy(false);
        return;
      }
      const imp = json.data.imported;
      const summary = `Imported ${imp?.pages ?? 0} page${
        (imp?.pages ?? 0) === 1 ? "" : "s"
      }${
        imp?.posts ? ` + ${imp.posts} post${imp.posts === 1 ? "" : "s"}` : ""
      } via ${imp?.source === "connector_site_content" ? "Connector" : "WP REST"}`;
      if (imp?.limitations?.length) setLimitations(imp.limitations);
      setStatus(`${summary}. Review pages in Studio (site left as draft).`);
      onImported?.(json.data.website, summary);
    } catch {
      setError("Network error during import");
      setStatus("");
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
          <span className="rounded border border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0.5 text-[11px] font-medium text-emerald-200">
            Content importer v0
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Pull pages from your connected WordPress site into this Gen 2 Website
          as editable Studio blocks.{" "}
          <strong className="font-medium text-slate-300">
            Not a theme/pixel clone
          </strong>
          — layout, Elementor/Divi, menus, widgets, and plugins are not
          converted.
        </p>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Connector
        </p>
        {loading ? (
          <p className="text-sm text-slate-400">Checking…</p>
        ) : connector ? (
          <>
            <p className="text-sm text-slate-200">
              {connector.label || "WordPress"} ·{" "}
              <span
                className={connected ? "text-emerald-300" : "text-amber-200"}
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

      <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-3 space-y-2 text-xs text-slate-400">
        <p className="font-medium text-slate-300">What converts</p>
        <ul className="list-disc list-inside space-y-1">
          <li>WP pages → Gen 2 pages (home first when set)</li>
          <li>
            Body HTML → heading, paragraph, image, list, CTA, html blocks
          </li>
          <li>Titles, slugs, basic SEO title/description</li>
          <li>Featured / inline image URLs (hotlinked in v0)</li>
        </ul>
        <p className="font-medium text-slate-300 pt-1">What doesn’t</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Theme, Elementor/Divi pixel layouts, menus, widgets, Woo</li>
          <li>Plugin behaviour / shortcodes (best-effort HTML flatten)</li>
          <li>Media re-host to DG CDN</li>
        </ul>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={includePosts}
          onChange={(e) => setIncludePosts(e.target.checked)}
          disabled={busy}
        />
        Include recent blog posts (as extra pages)
      </label>

      {alreadyImported ? (
        <p className="text-xs text-emerald-300/90">
          Last import{" "}
          {wp.importedAt
            ? new Date(wp.importedAt).toLocaleString("en-AU")
            : "completed"}
          {typeof wp.pageCount === "number"
            ? ` · ${wp.pageCount} pages`
            : ""}
          {wp.source ? ` · ${wp.source}` : ""}. Re-running replaces all pages on
          this site.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !connector?.connectorBaseUrl}
          onClick={() => void runImport()}
          className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy
            ? "Importing…"
            : alreadyImported
              ? "Re-import from WordPress"
              : "Import pages from WordPress"}
        </button>
        <Link
          href={`/sites/${website.slug}?preview=1`}
          target="_blank"
          className="text-sm text-slate-400 hover:underline"
        >
          Preview draft →
        </Link>
      </div>

      {status ? <p className="text-xs text-emerald-300/90">{status}</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      {limitations.length > 0 ? (
        <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
          {limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
