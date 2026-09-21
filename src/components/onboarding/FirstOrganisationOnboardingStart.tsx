"use client";

import { useState } from "react";

export function FirstOrganisationOnboardingStart({
  initialBusinessName = "",
}: {
  initialBusinessName?: string;
}) {
  const [name, setName] = useState(initialBusinessName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    const businessName = name.trim();
    if (!businessName) {
      setError("Enter your business name to start setup.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/v1/org/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: businessName, template: "default", firstOrganisation: true }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(json.error?.message || "Could not start your setup.");
      return;
    }
    window.location.assign("/onboarding");
  }

  return (
    <main className="dg-page-main mx-auto max-w-lg px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">14-day free trial</p>
      <h1 className="mt-3 text-3xl font-bold text-white">Set up your DigitalGate workspace</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Start with your business name. Your organisation is created here as part of onboarding — there is no separate account setup stage.
      </p>
      <label className="mt-7 block text-sm font-medium text-slate-200">
        Business name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void begin(); }}
          autoFocus
          autoComplete="organization"
          className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-violet-400/60"
          placeholder="Your business"
        />
      </label>
      <button
        type="button"
        onClick={() => void begin()}
        disabled={saving}
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Preparing your workspace…" : "Start setup →"}
      </button>
      {error ? <p className="mt-4 text-sm text-amber-300" role="alert">{error}</p> : null}
    </main>
  );
}
