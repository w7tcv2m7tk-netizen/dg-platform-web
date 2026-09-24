"use client";

import Link from "next/link";
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
          ? "Stripe is taking longer than expected to confirm your subscription. Your DigitalGate setup is saved — there is no need to restart onboarding or submit payment again."
          : "DigitalGate is confirming your subscription automatically. Your setup is already saved and this page will update as soon as Stripe confirms it."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          Check confirmation
        </button>
        {exhausted ? (
          <Link
            href="/support"
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/75 hover:border-white/30"
          >
            Get help
          </Link>
        ) : null}
      </div>
      {!exhausted ? (
        <p className="mt-3 text-xs text-white/35">
          Automatic check {Math.min(checks + 1, MAX_AUTO_CHECKS)} of {MAX_AUTO_CHECKS}
        </p>
      ) : null}
    </div>
  );
}
