"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DisplayItem = { id: string; label: string };

type Offer = {
  label: string;
  amountCents: number;
  cadence: "monthly" | "annual";
  platformTier: "starter" | "professional" | "business";
  platformLabel: string;
  industryApps: DisplayItem[];
  industryTemplates: DisplayItem[];
  premiumApps: DisplayItem[];
  supportPlan: string;
  supportLabel: string;
  seats?: number;
  trialDays: number;
  oneOffAmountCents?: number;
  oneOffLabel?: string;
  notes?: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function chips(items: DisplayItem[], empty: string) {
  if (!items.length) return <span className="text-sm text-slate-500">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1.5 text-xs text-violet-100"
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function CustomOfferPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/custom-offer?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.status === 410 || json.error?.code === "offer_already_claimed") {
          setAlreadyAccepted(true);
          return;
        }
        if (!res.ok) throw new Error(json.error?.message || "This custom pricing offer is unavailable.");
        setOffer(json.data.offer);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "This custom pricing offer is unavailable."),
      );
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
    if (res.status === 409 || json.error?.code === "offer_already_claimed") {
      setAlreadyAccepted(true);
      setOffer(null);
      setClaiming(false);
      return;
    }
    if (!res.ok) {
      setError(json.error?.message || "Could not accept this offer.");
      setClaiming(false);
      return;
    }
    window.location.assign(json.data.onboardingUrl || "/onboarding");
  }

  if (alreadyAccepted) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">DigitalGate</p>
        <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-7">
          <h1 className="text-2xl font-semibold text-white">This offer has already been accepted.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The private offer link is now closed. If this is your DigitalGate organisation, sign in to continue setup or activation.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Sign in to DigitalGate →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-14 text-slate-100">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">DigitalGate</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Your DigitalGate offer</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Review the package prepared for your business. Accepting the offer saves these commercial terms to your DigitalGate organisation; payment details are entered securely through Stripe later in activation.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {error}
        </div>
      ) : null}
      {!offer && !error ? <p className="mt-8 text-sm text-slate-400">Loading your offer…</p> : null}

      {offer ? (
        <section className="mt-8 overflow-hidden rounded-3xl border border-violet-300/15 bg-slate-950/70 shadow-2xl shadow-black/25">
          <div className="border-b border-white/[0.07] bg-violet-500/[0.06] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Prepared package</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{offer.label}</h2>
            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="text-4xl font-bold text-white">{money(offer.amountCents)}</p>
              <p className="pb-1 text-sm text-slate-400">/{offer.cadence === "annual" ? "year" : "month"} recurring</p>
            </div>
            {offer.trialDays > 0 ? (
              <p className="mt-2 text-sm font-medium text-emerald-300">
                {offer.trialDays}-day free trial on the recurring subscription
              </p>
            ) : null}
          </div>

          <div className="space-y-6 p-6 sm:p-7">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Platform</dt>
                <dd className="mt-1 font-medium text-white">{offer.platformLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Support</dt>
                <dd className="mt-1 font-medium text-white">{offer.supportLabel}</dd>
              </div>
              {offer.seats ? (
                <div>
                  <dt className="text-slate-500">Included users</dt>
                  <dd className="mt-1 font-medium text-white">{offer.seats}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-500">Billing</dt>
                <dd className="mt-1 font-medium text-white">
                  {offer.cadence === "annual" ? "Annual" : "Monthly"}
                </dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Industry Apps</p>
              <div className="mt-2">{chips(offer.industryApps, "No Industry App included")}</div>
            </div>

            {offer.industryTemplates.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Business types included</p>
                <div className="mt-2">{chips(offer.industryTemplates, "")}</div>
              </div>
            ) : null}

            {offer.premiumApps.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Growth Apps</p>
                <div className="mt-2">{chips(offer.premiumApps, "")}</div>
              </div>
            ) : null}

            {offer.oneOffAmountCents ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{offer.oneOffLabel || "Implementation & setup"}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      One-off charge due when secure Stripe activation is completed. This charge is separate from any recurring-subscription trial.
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-amber-200">{money(offer.oneOffAmountCents)}</p>
                </div>
              </div>
            ) : null}

            {offer.notes ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Offer notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{offer.notes}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-emerald-200">What happens next</p>
              <p className="mt-1">
                Accepting this offer does not charge your card. You’ll continue into DigitalGate onboarding with this package locked in. Secure payment setup happens at the activation step through Stripe.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void accept()}
              disabled={claiming}
              className="min-h-12 w-full rounded-full bg-violet-600 px-6 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 sm:w-auto"
            >
              {claiming ? "Accepting offer…" : "Accept offer & continue to setup →"}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              You’ll be asked to sign in or create your DigitalGate account if needed. The offer is attached to the organisation that accepts it and the private link then closes.
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
