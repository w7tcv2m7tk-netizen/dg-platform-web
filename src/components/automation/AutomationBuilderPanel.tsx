"use client";

import { useEffect, useState } from "react";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

type RuleRow = { id: string; trigger: string; action: string; enabled: boolean };
type ManifestRow = { id: string; label: string; appId: string; appName: string };

export function AutomationBuilderPanel() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [triggers, setTriggers] = useState<ManifestRow[]>([]);
  const [actions, setActions] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/automation/rules")
      .then((r) => r.json())
      .then((json) => {
        setRules(json?.data?.rules ?? []);
        setTriggers(json?.data?.manifestTriggers ?? []);
        setActions(json?.data?.manifestActions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading automation registry…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="dg-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Active rules</h2>
          <RoadmapStatusBadge status="in_progress" />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Platform defaults booted at startup (real CRM / commerce actions). Custom
          visual builder still deferred.
        </p>
        {!rules.length ? (
          <p className="mt-3 text-sm text-slate-500">No rules registered yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span className="font-mono text-slate-300">{rule.id}</span>
                <span className="text-slate-500">
                  {rule.trigger} → {rule.action}
                </span>
                <span className={rule.enabled ? "text-emerald-400" : "text-slate-500"}>
                  {rule.enabled ? "on" : "off"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Declared triggers</h2>
          <p className="mt-1 text-sm text-slate-400">From app manifests — wire in builder</p>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {triggers.map((t) => (
              <li key={`${t.appId}-${t.id}`} className="text-sm">
                <span className="text-white">{t.label}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {t.appName} · <code className="text-slate-400">{t.id}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Declared actions</h2>
          <p className="mt-1 text-sm text-slate-400">Available when builder ships</p>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {actions.map((a) => (
              <li key={`${a.appId}-${a.id}`} className="text-sm">
                <span className="text-white">{a.label}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {a.appName} · <code className="text-slate-400">{a.id}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
