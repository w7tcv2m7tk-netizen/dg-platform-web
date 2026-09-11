"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RuleRow = {
  id: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

function humanise(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AutomationRulesList() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/automation/rules")
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error?.message ?? "Could not load automation rules.");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setRules(json?.data?.rules ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load automation rules.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="dg-card animate-pulse" aria-live="polite">
        <div className="h-5 w-32 rounded bg-slate-800" />
        <div className="mt-3 h-4 w-64 max-w-full rounded bg-slate-800/70" />
        <div className="mt-5 space-y-2">
          <div className="h-16 rounded-lg bg-slate-900" />
          <div className="h-16 rounded-lg bg-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Supported rules</h2>
          <Link href="/apps/automation/logs" className="text-sm text-blue-400 hover:underline">
            View run history →
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          These DigitalGate-managed workflows run when their supported business events occur.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="status">
            {error}
          </p>
        ) : !rules.length ? (
          <p className="mt-3 text-sm text-slate-500">No supported automation rules are active.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="rounded-lg border border-slate-800 px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{humanise(rule.id)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      When <span className="text-slate-300">{humanise(rule.trigger)}</span> → {" "}
                      <span className="text-slate-300">{humanise(rule.action)}</span>
                    </p>
                  </div>
                  <span className={rule.enabled ? "text-emerald-400" : "text-slate-500"}>
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
