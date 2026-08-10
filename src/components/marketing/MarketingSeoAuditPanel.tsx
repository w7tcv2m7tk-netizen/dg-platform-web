"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePendingAction } from "@/hooks/usePendingAction";

type AuditFinding = {
  domain: string;
  severity: string;
  title: string;
  detail: string;
  recommendedAction?: string;
};

type AuditResult = {
  auditedAt: string;
  websiteUrl: string | null;
  scores: {
    seo: number;
    websiteHealth: number;
    aiVisibility: number;
    nativeSeo: number | null;
  };
  findings: AuditFinding[];
};

export function MarketingSeoAuditPanel({
  runAuditAction,
}: {
  runAuditAction: () => Promise<{ error?: string; data?: AuditResult }>;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AuditResult | null>(null);
  const { pending, error, setError, run, startTransition } = usePendingAction();

  async function runAudit() {
    await run(async () => {
      const apiRes = await fetch("/api/v1/seo/audit", { method: "POST" });
      if (apiRes.ok) {
        const json = (await apiRes.json()) as { data?: AuditResult };
        if (json.data) {
          setResult(json.data);
          startTransition(() => router.refresh());
          return;
        }
      }

      const fallback = await runAuditAction();
      if (fallback.error) {
        setError(fallback.error);
        throw new Error(fallback.error);
      }
      if (fallback.data) {
        setResult(fallback.data);
        startTransition(() => router.refresh());
      }
    });
  }

  const display = result;

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => void runAudit()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? "Running audit…" : "Run SEO audit"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {display ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-xs text-slate-500">
            Audited {new Date(display.auditedAt).toLocaleString("en-AU")}
            {display.websiteUrl ? ` · ${display.websiteUrl}` : ""}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <li className="text-sm">
              <span className="text-slate-400">SEO </span>
              <span className="font-semibold text-white">{display.scores.seo}/100</span>
            </li>
            <li className="text-sm">
              <span className="text-slate-400">Website </span>
              <span className="font-semibold text-white">{display.scores.websiteHealth}/100</span>
            </li>
            <li className="text-sm">
              <span className="text-slate-400">AI Visibility </span>
              <span className="font-semibold text-white">{display.scores.aiVisibility}/100</span>
            </li>
            <li className="text-sm">
              <span className="text-slate-400">Studio SEO </span>
              <span className="font-semibold text-white">
                {display.scores.nativeSeo != null ? `${display.scores.nativeSeo}/100` : "—"}
              </span>
            </li>
          </ul>
          {display.findings.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {display.findings.slice(0, 8).map((finding, index) => (
                <li key={`${finding.title}-${index}`} className="text-sm text-slate-300">
                  <span className="text-amber-400">{finding.title}</span>
                  {" — "}
                  {finding.detail}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">No major findings in this audit.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
