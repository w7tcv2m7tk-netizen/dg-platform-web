"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type OrgOption = {
  organisationId: string;
  organisationName: string;
  successScore: number;
  scoreProvisional?: boolean;
  needsAttention?: boolean;
};

type AdvisorResult = {
  organisationId: string;
  organisationName: string;
  successScore: number;
  healthTier: string;
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: Array<{
    id: string;
    label: string;
    description?: string;
    href?: string;
    priority: number;
  }>;
  source: "llm" | "template";
  provider?: string;
  model?: string;
  generatedAt: string;
};

const STAFF_EXAMPLES = [
  "What should I focus on for this organisation today?",
  "Where are the biggest risks?",
  "Give me a summary for the account owner.",
  "What should we intervene on this week?",
];

export function AiAdvisorPanel({
  orgs,
  initialOrgId,
}: {
  orgs: OrgOption[];
  initialOrgId?: string;
}) {
  const defaultOrg = useMemo(() => {
    if (initialOrgId && orgs.some((o) => o.organisationId === initialOrgId)) {
      return initialOrgId;
    }
    return orgs[0]?.organisationId ?? "";
  }, [initialOrgId, orgs]);

  const [organisationId, setOrganisationId] = useState(defaultOrg);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  async function runAdvisor() {
    if (!organisationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/command/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          question: question.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Request failed (${res.status})`);
      }
      setResult(json.data as AdvisorResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Advisor failed");
    } finally {
      setLoading(false);
    }
  }

  if (orgs.length === 0) {
    return (
      <p className="text-sm text-slate-500">No client organisations available yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-slate-950/50 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/90">
          Ask your Advisor
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">What would you like help with?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Reason across Customer Intelligence, Organisation Health, connectors and live signals —
          then decide what DigitalGate should do next.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_2fr]">
          <label className="block text-sm">
            <span className="text-slate-400">Organisation</span>
            <select
              value={organisationId}
              onChange={(e) => setOrganisationId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white"
            >
              {orgs.map((org) => (
                <option key={org.organisationId} value={org.organisationId}>
                  {org.organisationName}
                  {org.scoreProvisional ? " · insufficient data" : ` · health ${org.successScore}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Question</span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Ask a question or describe a problem..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-600"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runAdvisor()}
            disabled={loading || !organisationId}
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Ask Advisor →"}
          </button>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {STAFF_EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setQuestion(example)}
                className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-violet-500/50 hover:text-white"
              >
                “{example}”
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {result.organisationName}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Advisor insight</h2>
              </div>
              <p className="text-xs text-slate-500">
                Organisation health {result.successScore}/100
                {result.healthTier ? ` · ${result.healthTier.replace(/_/g, " ")}` : ""}
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-200">{result.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <h3 className="text-sm font-semibold text-emerald-300">Positives</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {result.positives.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <h3 className="text-sm font-semibold text-amber-300">Concerns</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {result.concerns.length ? (
                  result.concerns.map((c) => <li key={c}>· {c}</li>)
                ) : (
                  <li className="text-slate-500">No major concerns</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
            <h3 className="text-sm font-semibold text-white">Recommended Actions</h3>
            <p className="mt-1 text-sm text-slate-500">
              What DigitalGate thinks the team should do next for this organisation.
            </p>
            <ul className="mt-3 space-y-3">
              {result.recommendations.map((rec, index) => (
                <li
                  key={rec.id}
                  className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-white">
                      {index + 1}. {rec.label}
                    </p>
                    {rec.description ? (
                      <p className="mt-1 text-sm text-slate-400">{rec.description}</p>
                    ) : null}
                  </div>
                  {rec.href ? (
                    <Link href={rec.href} className="shrink-0 text-sm text-sky-400 hover:underline">
                      Open →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            {showTechnical ? "Hide technical details" : "View technical details →"}
          </button>
          {showTechnical ? (
            <p className="text-xs text-slate-600">
              Generated {new Date(result.generatedAt).toLocaleString("en-AU")}
              {result.source ? ` · ${result.source}` : ""}
              {result.provider ? ` · ${result.provider}` : ""}
              {result.model ? ` · ${result.model}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
