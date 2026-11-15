"use client";

import { useState } from "react";

import type { UserOrganisationSummary } from "@dg/platform-core";

export function SessionRecovery({
  organisations,
  noMembership = false,
}: {
  organisations: UserOrganisationSummary[];
  noMembership?: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseOrganisation(organisationId: string) {
    setPendingId(organisationId);
    setError(null);
    try {
      const response = await fetch("/api/v1/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body?.error?.message ?? "Could not open that business.");
        setPendingId(null);
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Could not open that business.");
      setPendingId(null);
    }
  }

  return (
    <main
      data-testid="session-recovery"
      className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
        DigitalGate
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white">
        {noMembership ? "No active business access" : "Choose a business"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {noMembership
          ? "No active organisation membership is available for this account. Sign in with another account or contact your organisation owner."
          : "Your saved business selection is no longer available. Choose one of your active memberships to continue."}
      </p>

      {organisations.length > 0 ? (
        <div className="mt-6 space-y-3">
          {organisations.map((organisation) => (
            <button
              key={organisation.organisationId}
              type="button"
              aria-label={`Open ${organisation.organisationName}`}
              disabled={pendingId !== null}
              onClick={() => void chooseOrganisation(organisation.organisationId)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-white transition hover:border-violet-400 disabled:opacity-60"
            >
              <span className="truncate">{organisation.organisationName}</span>
              <span className="text-xs text-violet-300">
                {pendingId === organisation.organisationId ? "Opening…" : "Open →"}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}
    </main>
  );
}
