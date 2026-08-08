"use client";

import { useState } from "react";

import type { UserOrganisationSummary } from "@dg/platform-core";

export function OrgSwitcher({
  activeOrganisationId,
  activeOrganisationName,
  organisations,
}: {
  activeOrganisationId: string;
  activeOrganisationName: string;
  organisations: UserOrganisationSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTemplate, setNewTemplate] = useState<
    "real-estate" | "accommodation" | "creator" | "default"
  >("default");
  const [error, setError] = useState<string | null>(null);

  async function switchOrg(organisationId: string) {
    if (organisationId === activeOrganisationId) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/v1/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organisationId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(json.error?.message ?? "Could not switch organisation");
      return;
    }
    // Hard navigate so brand theme, favicon, apps, and page data all remount for the new org.
    window.location.assign("/dashboard");
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/v1/org/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), template: newTemplate }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCreating(false);
      setError(json.error?.message ?? "Could not create organisation");
      return;
    }
    // RE beta onboarding path: Business Profile → connector → team → /apps/re
    if (newTemplate === "real-estate") {
      window.location.assign("/dashboard/business?reOnboarding=1");
      return;
    }
    window.location.assign("/dashboard");
  }

  const hasMultiple = organisations.length > 1;

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={ pending}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-left transition hover:border-slate-600 hover:bg-slate-900"
        aria-expanded={ open}
        aria-haspopup="listbox"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{ activeOrganisationName}</p>
          <p className="text-xs text-slate-500">
            { hasMultiple ? `${ organisations.length} businesses` : "Active business"}
          </p>
        </div>
        <span className="shrink-0 text-slate-500" aria-hidden>
          { open ? "▴" : "▾"}
        </span>
      </button>

      { open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-700 bg-slate-950 py-1 shadow-xl">
          <ul className="max-h-48 overflow-y-auto" role="listbox">
            { organisations.map((org) => (
              <li key={ org.organisationId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ org.organisationId === activeOrganisationId}
                  onClick={() => switchOrg(org.organisationId)}
                  disabled={ pending}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-800/80 ${
                    org.organisationId === activeOrganisationId
                      ? "bg-blue-500/10 text-blue-200"
                      : "text-slate-200"
                  }`}
                >
                  <span className="truncate">{ org.organisationName}</span>
                  { org.organisationId === activeOrganisationId ? (
                    <span className="text-xs text-blue-400">Active</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-800 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Add business
            </p>
            <form onSubmit={ createOrg} className="space-y-2">
              <input
                type="text"
                value={ newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Roe Realty"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600"
              />
              <select
                value={ newTemplate}
                onChange={(e) =>
                  setNewTemplate(
                    e.target.value as "real-estate" | "accommodation" | "creator" | "default",
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-200"
              >
                <option value="real-estate">Real Estate template</option>
                <option value="accommodation">Accommodation template (CVH)</option>
                <option value="creator">Creator template (Aëtherra)</option>
                <option value="default">General business</option>
              </select>
              <button
                type="submit"
                disabled={ creating || !newName.trim()}
                className="w-full rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                { creating ? "Creating…" : "Create & switch"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      { error ? <p className="mt-1 text-xs text-amber-400">{ error}</p> : null}
    </div>
  );
}
