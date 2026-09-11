"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RuleRow = { id: string; enabled: boolean };

function formatRuleLabel(id: string) {
  return id
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AutomationRulesList() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/automation/rules")
      .then((r) => r.json())
      .then((json) => {
        setRules(json?.data?.rules ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading automation rules…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="dg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Active rules</h2>
          <Link href="/apps/automation/logs" className="text-sm text-blue-400 hover:underline">
            View run history →
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          These workflows run automatically when their supported business events occur.
        </p>
        {!rules.length ? (
          <p className="mt-3 text-sm text-slate-500">No automation rules are active.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">{formatRuleLabel(rule.id)}</span>
                <span className={rule.enabled ? "text-emerald-400" : "text-slate-500"}>
                  {rule.enabled ? "Enabled" : "Disabled"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
