"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Offer = {
  label: string;
  amountCents: number;
  cadence: "monthly" | "annual";
  platformTier: "starter" | "professional" | "business";
  industryApps: string[];
  premiumApps: string[];
  supportPlan: string;
  seats?: number;
  trialDays: number;
  oneOffAmountCents?: number;
  oneOffLabel?: string;
  notes?: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function CustomOfferPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/custom-offer?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error?.message || "This custom pricing offer is unavailable.");
        setOffer(json.data.offer);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "This custom pricing offer is unavailable."));
  }, [token]);

  async function accept() {
    setClaiming(true);
    setError("");
    const res = await fetch("/api/public/custom-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.status === 401) {
      const back = `/custom-offer/${encodeURIComponent(token)}`;
      window.location.assign(`/login?redirect_url=${encodeURIComponent(back)}`);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error?.message || "Could not accept this offer.");
      setClaiming(false);
      return;
    }
    window.location.assign(json.data.onboardingUrl || "/onboarding");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-14 text-slate-100">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">DigitalGate</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Your custom pricing offer</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        This offer was prepared specifically for you. Custom pricing is independent of Founding 10 status.
      </p>
      {error ? <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{error}</div> : null}
      {!offer && !error ? <p className="mt-8 text-sm text-slate-400">Loading offer…</p> : null}
      {offer ? (
        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-white">{offer.label}</h2>
          <p className="mt-3 text-3xl font-bold text-white">{money(offer.amountCents)} <span className="text-base font-normal text-slate-400">/{offer.cadence === "annual" ? "year" : "month"}</span></p>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Platform</dt><dd className="capitalize text-white">{offer.platformTier === "professional" ? "Growth" : offer.platformTier === "business" ? "Scale" : "Starter"}</dd></div>
            <div><dt className="text-slate-500">Trial</dt><dd className="text-white">{offer.trialDays > 0 ? `${offer.trialDays} days` : "No trial"}</dd></div>
            <div><dt className="text-slate-500">Support</dt><dd className="capitalize text-white">{offer.supportPlan.replace(/_/g, " ")}</dd></div>
            {offer.seats ? <div><dt className="text-slate-500">Users</dt><dd className="text-white">{offer.seats}</dd></div> : null}
            {offer.industryApps.length ? <div className="sm:col-span-2"><dt className="text-slate-500">Industry Apps</dt><dd className="text-white">{offer.industryApps.join(", ")}</dd></div> : null}
            {offer.oneOffAmountCents ? <div className="sm:col-span-2"><dt className="text-slate-500">{offer.oneOffLabel || "One-off setup"}</dt><dd className="text-white">{money(offer.oneOffAmountCents)}</dd></div> : null}
          </dl>
          {offer.notes ? <p className="mt-5 whitespace-pre-wrap text-sm text-slate-300">{offer.notes}</p> : null}
          <button type="button" onClick={() => void accept()} disabled={claiming} className="mt-7 min-h-11 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
            {claiming ? "Applying offer…" : "Accept offer & continue →"}
          </button>
          <p className="mt-3 text-xs text-slate-500">Sign in or create your DigitalGate account to attach this offer to your organisation and continue onboarding.</p>
        </section>
      ) : null}
    </main>
  );
}
