"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type WebsiteSignalProbes = {
  reachable: boolean | null;
  https: boolean | null;
  title: string | null;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasJsonLd: boolean;
  hasH1: boolean;
};

export type WebsiteSignalFinding = {
  domain: string;
  severity: string;
  title: string;
  detail: string;
  recommendedAction?: string;
};

function severityClass(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-sky-400";
  }
}

function probeRow(label: string, ok: boolean | null | undefined) {
  const passed = ok === true;
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span
        className={
          passed ? "text-emerald-400" : ok === false ? "text-red-400" : "text-slate-500"
        }
      >
        {passed ? "Pass" : ok === false ? "Fail" : "—"}
      </span>
    </li>
  );
}

/**
 * Shared SEO + AI Visibility evidence strip — last presence audit probes only.
 * Does not invent ChatGPT/Gemini citation metrics.
 */
export function WebsiteSignalsPanel({
  websiteUrl,
  auditedAt,
  probes,
  findings = [],
  scanLabel = "Scan website presence",
  showStudioLink = true,
}: {
  websiteUrl: string | null;
  auditedAt: string | null;
  probes: WebsiteSignalProbes | null;
  findings?: WebsiteSignalFinding[];
  scanLabel?: string;
  showStudioLink?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/seo/audit", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Audit failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dg-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Website signals</h2>
          <p className="mt-1 text-sm text-slate-400">
            Observable HTML from your public site — same audit as SEO Engine. Not live
            ChatGPT / Gemini / Perplexity monitoring.
          </p>
          {auditedAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Last scan{" "}
              {new Date(auditedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {websiteUrl ? ` · ${websiteUrl}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-200/80">Not scanned yet</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runAudit}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? "Scanning…" : scanLabel}
          </button>
          <Link
            href="/apps/seo/audit"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-sky-500"
          >
            Full SEO audit →
          </Link>
        </div>
      </div>

      {!websiteUrl ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          No website URL on file — presence cannot be measured.{" "}
          <Link href="/dashboard/business" className="text-sky-300 hover:underline">
            Add URL in Business Profile →
          </Link>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {probes ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {probeRow("Reachable", probes.reachable)}
          {probeRow("HTTPS", probes.https)}
          {probeRow("Title tag", probes.title != null && probes.title.length > 0)}
          {probeRow("Meta description", probes.hasMetaDescription)}
          {probeRow("Viewport", probes.hasViewport)}
          {probeRow("Open Graph", probes.hasOpenGraph)}
          {probeRow("JSON-LD / schema.org", probes.hasJsonLd)}
          {probeRow("H1", probes.hasH1)}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Run a scan to populate reachable, HTTPS, title, meta, OG, JSON-LD, and H1 checks.
        </p>
      )}

      {findings.length > 0 ? (
        <ul className="space-y-2 border-t border-slate-800 pt-4">
          {findings.slice(0, 12).map((f, i) => (
            <li
              key={`${f.title}-${i}`}
              className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
            >
              <span className={`font-medium ${severityClass(f.severity)}`}>{f.severity}</span>
              <span className="ml-2 text-xs uppercase text-slate-600">{f.domain}</span>
              <p className="mt-1 font-medium text-white">{f.title}</p>
              <p className="text-slate-400">{f.detail}</p>
              {f.recommendedAction ? (
                <p className="mt-1 text-xs text-slate-500">{f.recommendedAction}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-3 text-sm">
        {showStudioLink ? (
          <Link href="/apps/websites" className="text-sky-400 hover:underline">
            Fix on-page SEO in Website Studio →
          </Link>
        ) : null}
        <Link href="/apps/ai-visibility" className="text-sky-400 hover:underline">
          AI Visibility →
        </Link>
        <Link href="/apps/seo" className="text-sky-400 hover:underline">
          SEO overview →
        </Link>
      </div>
    </section>
  );
}
