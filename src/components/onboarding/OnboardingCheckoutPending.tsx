"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AUTO_CHECKS = 10;
const CHECK_INTERVAL_MS = 3000;

export function OnboardingCheckoutPending() {
  const router = useRouter();
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    if (checks >= MAX_AUTO_CHECKS) return;
    const timer = window.setTimeout(() => {
      setChecks((value) => value + 1);
      router.refresh();
    }, CHECK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [checks, router]);

  const exhausted = checks >= MAX_AUTO_CHECKS;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-violet-300/15 bg-white/[0.035] p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
        Confirming your subscription
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white">Aida is preparing your setup</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {exhausted
          ? "Stripe is taking longer than expected to confirm your subscription. You can check again now without restarting onboarding."
          : "DigitalGate is confirming your subscription automatically. This page will update as soon as Stripe confirms it."}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white"
      >
        Check confirmation
      </button>
      {!exhausted ? (
        <p className="mt-3 text-xs text-white/35">
          Automatic check {Math.min(checks + 1, MAX_AUTO_CHECKS)} of {MAX_AUTO_CHECKS}
        </p>
      ) : null}
    </div>
  );
}
