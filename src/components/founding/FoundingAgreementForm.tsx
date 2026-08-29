"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FoundingAgreementForm({
  businessName,
  alreadySigned,
}: {
  businessName: string;
  alreadySigned: boolean;
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
        I confirm the Founding 10 commercial terms (standard published Platform + Apps pricing,
        Founding programme benefits, Founding Acquisition Partner referral terms where invited, and
        programme participation) and want DigitalGate to proceed to onboarding.
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
