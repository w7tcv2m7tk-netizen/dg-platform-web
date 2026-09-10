"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Grant = {
  module: string;
  subModule?: string;
  action: string;
  scope: string;
};

const MODULES = [
  "crm",
  "commerce",
  "documents",
  "communications",
  "websites",
  "infrastructure",
  "industry",
  "growth",
  "intelligence",
  "team",
  "billing",
  "settings",
  "partners",
  "delivery",
] as const;
const ACTIONS = ["view", "create", "edit", "delete", "export", "manage", "approve", "assign"] as const;
const SCOPES = ["own", "assigned", "team", "organisation"] as const;

function normaliseGrants(value: unknown): Grant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const grant = item as Record<string, unknown>;
    if (
      typeof grant.module !== "string" ||
      typeof grant.action !== "string" ||
      typeof grant.scope !== "string"
    ) {
      return [];
    }
    return [
      {
        module: grant.module,
        action: grant.action,
        scope: grant.scope,
        ...(typeof grant.subModule === "string" && grant.subModule.trim()
          ? { subModule: grant.subModule.trim() }
          : {}),
      },
    ];
  });
}

export function TeamPermissionsEditor({
  membershipId,
  permissions,
  disabled = false,
}: {
  membershipId: string;
  permissions: unknown;
  disabled?: boolean;
}) {
  const router = useRouter();
  const initial = useMemo(() => normaliseGrants(permissions), [permissions]);
  const [grants, setGrants] = useState<Grant[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (disabled) return null;

  function updateGrant(index: number, patch: Partial<Grant>) {
    setGrants((current) => current.map((grant, i) => (i === index ? { ...grant, ...patch } : grant)));
    setMessage(null);
  }

  function addGrant() {
    setGrants((current) => [
      ...current,
      { module: "crm", action: "view", scope: "organisation" },
    ]);
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/org/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, permissions: grants }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.error?.message ?? "Could not update permissions");
        return;
      }
      setMessage("Additional permissions saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Additional permissions</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            Role defaults remain in place. Use these grants only when this teammate needs extra access.
          </p>
        </div>
        <button type="button" onClick={addGrant} className="dg-btn dg-btn-secondary text-xs">
          Add grant
        </button>
      </div>

      {grants.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No additional grants — this teammate uses role defaults only.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {grants.map((grant, index) => (
            <div key={`${index}-${grant.module}-${grant.action}-${grant.scope}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <label className="text-[11px] text-slate-500">
                Module
                <select
                  value={grant.module}
                  onChange={(event) => updateGrant(index, { module: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                >
                  {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-slate-500">
                Area (optional)
                <input
                  value={grant.subModule ?? ""}
                  onChange={(event) => updateGrant(index, { subModule: event.target.value || undefined })}
                  placeholder="e.g. opportunities"
                  maxLength={80}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                />
              </label>
              <label className="text-[11px] text-slate-500">
                Action
                <select
                  value={grant.action}
                  onChange={(event) => updateGrant(index, { action: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                >
                  {ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-slate-500">
                Scope
                <select
                  value={grant.scope}
                  onChange={(event) => updateGrant(index, { scope: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                >
                  {SCOPES.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setGrants((current) => current.filter((_, i) => i !== index))}
                className="self-end rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:border-rose-500/60 hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="dg-btn dg-btn-primary text-xs disabled:opacity-60">
          {saving ? "Saving…" : "Save permissions"}
        </button>
        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      </div>
    </div>
  );
}
