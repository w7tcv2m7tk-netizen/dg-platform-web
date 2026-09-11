"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { NegotiatedCommercialOffer } from "@dg/platform-core";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function FoundingAgreementForm({
  businessName,
  alreadySigned,
  commercialOffer,
}: {
  businessName: string;
  alreadySigned: boolean;
  commercialOffer?: NegotiatedCommercialOffer | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const invite = search.get("invite")?.trim() || "";
  const [agreed, setAgreed] = useState(alreadySigned);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!agreed) {
      setMessage("Confirm the Founding terms before continuing.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    const res = await fetch("/api/v1/founding/agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken: invite || undefined }),
    });
    if (!res.ok) {
      setStatus("error");
      setMessage("Could not record agreement. Try again or contact Ben.");
      return;
    }
    router.push(invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : "/onboarding");
  }

  if (alreadySigned) {
    return (
      <div className="dg-card max-w-2xl">
        <p className="text-emerald-300">Founding Agreement recorded.</p>
        {commercialOffer ? (
          <p className="mt-2 text-sm text-slate-300">
            {commercialOffer.label} · {money(commercialOffer.amountCents)}/
            {commercialOffer.cadence === "annual" ? "year" : "month"}
          </p>
        ) : null}
        <Link href="/onboarding" className="mt-3 inline-block text-sky-400 hover:underline">
          Continue to onboarding →
        </Link>
      </div>
    );
  }

  return (
    <div className="dg-card max-w-2xl space-y-4">
      <p className="text-sm text-slate-400">
        This confirms Founding 10 participation for {businessName || "your business"}. It is
        separate from onboarding. Legal terms live on the public Founding Customer Terms page.
      </p>
      {commercialOffer ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Your agreed DigitalGate plan
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-semibold text-white">{commercialOffer.label}</p>
              <p className="mt-1 text-sm text-slate-400">
                {commercialOffer.seats ? `Up to ${commercialOffer.seats} users · ` : ""}
                {commercialOffer.trialDays > 0
                  ? `${commercialOffer.trialDays}-day trial`
                  : "Billing starts on activation"}
              </p>
            </div>
            <p className="text-xl font-semibold text-white">
              {money(commercialOffer.amountCents)}/
              {commercialOffer.cadence === "annual" ? "year" : "month"}
            </p>
          </div>
        </div>
      ) : null}
      <a
        href="https://digitalgate.com.au/founding-customer-terms/"
        className="text-sm text-sky-400 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        Read Founding Customer Terms →
      </a>
      <label className="flex items-start gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        {commercialOffer
          ? `I confirm the Founding 10 terms and the ${commercialOffer.label} commercial offer shown above, and want DigitalGate to proceed to onboarding.`
          : "I confirm the Founding 10 commercial terms (standard published Platform + Apps pricing, Founding programme benefits, Founding Acquisition Partner referral terms where invited, and programme participation) and want DigitalGate to proceed to onboarding."}
      </label>
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={status === "saving"}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
      >
        Confirm agreement &amp; start onboarding
      </button>
    </div>
  );
}
