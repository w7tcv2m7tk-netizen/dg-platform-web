"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PartnerTermsAcceptForm({
  termsAcceptedAt,
  termsVersion,
  currentTermsVersion,
}: {
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  currentTermsVersion: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upToDate = Boolean(termsAcceptedAt && termsVersion === currentTermsVersion);

  if (upToDate) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-100">
        <p className="font-medium text-white">Programme terms accepted</p>
        <p className="mt-1 text-emerald-200/90">
          Recorded {new Date(termsAcceptedAt!).toLocaleString("en-AU")} · version{" "}
          <span className="font-mono text-xs">{termsVersion}</span>
        </p>
        <p className="mt-2 text-xs text-emerald-200/70">
          This is DigitalGate&apos;s product acceptance record. Binding legal terms still require
          solicitor review when published.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checked || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/partner/terms/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, termsVersion: currentTermsVersion }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        throw new Error(json?.error?.message || "Could not record acceptance.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record acceptance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm"
    >
      <div>
        <p className="font-medium text-white">Accept programme rules</p>
        <p className="mt-1 text-amber-100/90">
          Confirm you have read the rules above. Version{" "}
          <span className="font-mono text-xs">{currentTermsVersion}</span>
          {termsAcceptedAt && termsVersion !== currentTermsVersion ? (
            <> — a newer version replaces your earlier acceptance.</>
          ) : null}
        </p>
      </div>
      <label className="flex items-start gap-3 text-slate-200">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          I understand the Founding Reseller model (introduce / Ben closes / DigitalGate delivers),
          qualifying commission fees, and that these are not yet solicitor-binding legal terms.
        </span>
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={!checked || busy}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Saving…" : "Accept programme rules"}
      </button>
    </form>
  );
}
