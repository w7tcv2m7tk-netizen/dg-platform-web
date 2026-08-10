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

  async function runAudit() {
    setLoading(true);
    setError(null);
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

  const probes = result?.presence.probes;
  const findings = result?.findings ?? [];

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
            disabled={loading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Auditing…" : "Run audit"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
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
