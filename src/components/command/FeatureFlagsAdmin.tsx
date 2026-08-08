"use client";

import { useState } from "react";

type KnownFlag = {
  id: string;
  label: string;
  description: string;
};

type OrgRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  flags: Record<string, boolean>;
  enabledCount: number;
};

export function FeatureFlagsAdmin({
  known,
  initialOrgs,
}: {
  known: readonly KnownFlag[];
  initialOrgs: OrgRow[];
}) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(orgId: string, flagId: string, next: boolean) {
    const key = `${orgId}:${flagId}`;
    setPending(key);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/command/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: orgId,
          flags: { [flagId]: next },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Update failed (${res.status})`);
      }
      const flags = json.data.flags as Record<string, boolean>;
      setOrgs((prev) =>
        prev.map((org) =>
          org.organisationId === orgId
            ? {
                ...org,
                flags,
                enabledCount: Object.values(flags).filter(Boolean).length,
              }
            : org,
        ),
      );
      setMessage(`Updated ${flagId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
        <h2 className="text-sm font-semibold text-white">Known flags</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          {known.map((flag) => (
            <li key={flag.id}>
              <span className="font-medium text-slate-200">{flag.label}</span>
              <span className="text-slate-500"> · {flag.id}</span>
              <span className="block text-xs text-slate-500">{flag.description}</span>
            </li>
          ))}
        </ul>
      </div>

      {message ? (
        <p className="text-sm text-slate-400">{message}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-700/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Organisation</th>
              {known.map((flag) => (
                <th key={flag.id} className="px-4 py-3 font-medium">
                  {flag.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {orgs.map((org) => (
              <tr key={org.organisationId} className="bg-slate-950/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{org.organisationName}</p>
                  <p className="text-xs text-slate-500">{org.organisationSlug}</p>
                </td>
                {known.map((flag) => {
                  const on = org.flags[flag.id] === true;
                  const key = `${org.organisationId}:${flag.id}`;
                  return (
                    <td key={flag.id} className="px-4 py-3">
                      <button
                        type="button"
                        disabled={pending === key}
                        onClick={() => void toggle(org.organisationId, flag.id, !on)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          on
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        } disabled:opacity-50`}
                      >
                        {on ? "On" : "Off"}
                      </button>
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-slate-400">{org.enabledCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
