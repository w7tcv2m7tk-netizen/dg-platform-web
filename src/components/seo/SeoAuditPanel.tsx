"use client";

import { useState } from "react";

type AuditScores = {
  seo: number;
  websiteHealth: number;
  aiVisibility: number;
  nativeSeo: number | null;
};

type AuditProbes = {
  reachable: boolean | null;
  https: boolean | null;
  title: string | null;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasJsonLd: boolean;
  hasH1: boolean;
};

type AuditFinding = {
  domain: string;
  severity: "critical" | "warning" | "opportunity";
  title: string;
  detail: string;
  recommendedAction?: string;
};

type AuditResult = {
  auditedAt: string;
  websiteUrl: string | null;
  scores: AuditScores;
  presence: { probes: AuditProbes; findings: AuditFinding[] };
  findings: AuditFinding[];
  activityId?: string;
};

type HistoryItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

type SeoFixItem = {
  id: string;
  label: string;
  status: "fixed" | "skipped" | "manual";
  detail: string;
};

type SeoFixResult = {
  applied: boolean;
  source: "llm" | "heuristic" | "none";
  items: SeoFixItem[];
  message: string;
  seo?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
  } | null;
};

function severityClass(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-blue-400";
  }
}

function probeStatus(ok: boolean | null | undefined, label: string) {
  const passed = ok === true;
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={passed ? "text-emerald-400" : ok === false ? "text-red-400" : "text-slate-500"}>
        {passed ? "Pass" : ok === false ? "Fail" : "—"}
      </span>
    </li>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SeoAuditPanel({
  defaultUrl,
  initialHistory,
}: {
  defaultUrl: string;
  initialHistory: HistoryItem[];
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<SeoFixResult | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    setFixResult(null);
    setFixError(null);
    try {
      const res = await fetch("/api/v1/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Audit failed");
        return;
      }
      const audit = json.data as AuditResult;
      setResult(audit);
      setHistory((prev) => [
        {
          id: audit.activityId ?? crypto.randomUUID(),
          title: `SEO audit · score ${audit.scores.seo}/100`,
          body: audit.websiteUrl ? `Audited ${audit.websiteUrl}` : "No website URL",
          createdAt: audit.auditedAt,
          metadata: {
            scores: audit.scores,
            websiteUrl: audit.websiteUrl,
            findingCount: audit.findings.length,
            probes: audit.presence.probes,
          },
        },
        ...prev,
      ]);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function runFixSeo() {
    if (!result) return;
    setFixing(true);
    setFixError(null);
    try {
      const res = await fetch("/api/v1/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: result.websiteUrl ?? (url.trim() || undefined),
          findings: result.findings,
          probes: result.presence.probes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFixError(json?.error?.message ?? "Fix SEO failed");
        return;
      }
      setFixResult(json.data as SeoFixResult);
    } catch {
      setFixError("Network error — try again");
    } finally {
      setFixing(false);
    }
  }

  const probes = result?.presence.probes;
  const findings = result?.findings ?? [];
  const canFixSeo =
    Boolean(result) &&
    Boolean(
      (probes && (!probes.title || !probes.hasMetaDescription || !probes.hasOpenGraph)) ||
        findings.some((f) => {
          const t = f.title.toLowerCase();
          return (
            t.includes("page title") ||
            t.includes("meta description") ||
            t.includes("open graph")
          );
        }),
    );

  return (
    <div className="space-y-6">
      <section className="dg-card">
        <h2 className="font-semibold text-white">Run SEO audit</h2>
        <p className="mt-1 text-sm text-slate-400">
          Live probe of your public website plus native Studio SEO checks when a site exists.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={runAudit}
            disabled={loading || fixing}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Auditing…" : "Run audit"}
          </button>
          {canFixSeo ? (
            <button
              type="button"
              onClick={runFixSeo}
              disabled={loading || fixing}
              className="rounded-full border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
            >
              {fixing ? "Fixing SEO…" : "Fix SEO"}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {fixError ? <p className="mt-3 text-sm text-red-400">{fixError}</p> : null}
        {fixResult ? (
          <div className="mt-4 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-3 text-sm">
            <p className="font-medium text-emerald-300">{fixResult.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              Source: {fixResult.source === "llm" ? "AI" : fixResult.source}
            </p>
            {fixResult.items.length ? (
              <ul className="mt-3 space-y-2">
                {fixResult.items.map((item) => (
                  <li key={item.id} className="rounded-md border border-slate-800 px-2 py-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          item.status === "fixed"
                            ? "text-emerald-400"
                            : item.status === "manual"
                              ? "text-amber-400"
                              : "text-slate-500"
                        }
                      >
                        {item.status}
                      </span>
                      <span className="font-medium text-white">{item.label}</span>
                    </div>
                    <p className="mt-0.5 text-slate-400">{item.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {fixResult.applied ? (
              <p className="mt-3 text-xs text-slate-500">
                Metadata written to Website Studio. Publish the site if needed, then re-run the audit.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">SEO score</p>
              <p className="mt-2 text-4xl font-bold text-white">{result.scores.seo}</p>
            </div>
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Website health</p>
              <p className="mt-2 text-4xl font-bold text-white">{result.scores.websiteHealth}</p>
            </div>
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">AI visibility</p>
              <p className="mt-2 text-4xl font-bold text-white">{result.scores.aiVisibility}</p>
            </div>
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Studio SEO</p>
              <p className="mt-2 text-4xl font-bold text-white">
                {result.scores.nativeSeo ?? "—"}
              </p>
            </div>
          </div>

          {probes ? (
            <section className="dg-card">
              <h2 className="font-semibold text-white">Probes checklist</h2>
              <ul className="mt-4 space-y-2">
                {probeStatus(probes.reachable, "Site reachable")}
                {probeStatus(probes.https, "HTTPS")}
                {probeStatus(Boolean(probes.title), "Page title")}
                {probeStatus(probes.hasMetaDescription, "Meta description")}
                {probeStatus(probes.hasViewport, "Mobile viewport")}
                {probeStatus(probes.hasOpenGraph, "Open Graph tags")}
                {probeStatus(probes.hasJsonLd, "Structured data (JSON-LD)")}
                {probeStatus(probes.hasH1, "H1 heading")}
              </ul>
            </section>
          ) : null}

          <section className="dg-card">
            <h2 className="font-semibold text-white">Findings</h2>
            {!findings.length ? (
              <p className="mt-3 text-sm text-slate-500">No issues detected in this audit.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {findings.map((f, i) => (
                  <li
                    key={`${f.title}-${i}`}
                    className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${severityClass(f.severity)}`}>
                        {f.severity}
                      </span>
                      <span className="text-xs uppercase text-slate-600">{f.domain}</span>
                    </div>
                    <p className="mt-1 font-medium text-white">{f.title}</p>
                    <p className="mt-1 text-slate-400">{f.detail}</p>
                    {f.recommendedAction ? (
                      <p className="mt-1 text-xs text-blue-400">{f.recommendedAction}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <section className="dg-card">
        <h2 className="font-semibold text-white">Audit history</h2>
        {!history.length ? (
          <p className="mt-3 text-sm text-slate-500">No audits yet — run your first audit above.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  {item.body ? <p className="text-slate-500">{item.body}</p> : null}
                  {item.metadata?.scores ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {(() => {
                        const scores = item.metadata.scores as AuditScores;
                        return `SEO ${scores.seo} · Health ${scores.websiteHealth} · AI ${scores.aiVisibility}`;
                      })()}
                    </p>
                  ) : null}
                </div>
                <time className="text-xs text-slate-500">{formatDate(item.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
