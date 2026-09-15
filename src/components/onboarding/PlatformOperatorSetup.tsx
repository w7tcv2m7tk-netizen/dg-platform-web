"use client";

import Image from "next/image";
import { useState } from "react";

const growthApps = ["Marketing", "Prospecting & Opportunity Engine", "AI Visibility", "SEO", "Automation", "Analytics", "Social", "Reputation"];

export function PlatformOperatorSetup({ businessName }: { businessName: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterWorkspace() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/onboarding/gen2/operator", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error?.message ?? "Could not prepare the operator workspace.");
        return;
      }
      window.location.assign("/dashboard?welcome=1");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto w-full max-w-4xl">
    <section className="mx-auto rounded-[2rem] border border-violet-300/15 bg-[#120b20]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
        <Image src="/aida/aida-welcome.webp" alt="Aida" width={220} height={240} priority className="mx-auto h-52 w-auto object-contain" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Your AI Business Partner</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{businessName} is the Platform Operator.</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">This is DigitalGate’s private operating workspace. Customer industry selection and customer billing are intentionally bypassed.</p>
        </div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Classification</p><p className="mt-2 font-medium text-white">Platform Operator · Technology & SaaS</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Industry Apps</p><p className="mt-2 font-medium text-white">None · customer Industry Apps stay hidden</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5 sm:col-span-2"><p className="text-[11px] uppercase tracking-[0.14em] text-white/30">Growth Apps · operator entitlement</p><div className="mt-3 flex flex-wrap gap-2">{growthApps.map(app => <span key={app} className="rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">✓ {app}</span>)}</div><p className="mt-3 text-xs text-white/40">All Growth Apps are available to DigitalGate at no customer charge.</p></div>
        <div className="rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] p-5 sm:col-span-2"><p className="text-xs font-semibold text-violet-200">Aida</p><p className="mt-2 text-sm text-white/60">I’ll keep DigitalGate focused on platform operations, product intelligence, growth and customer management rather than pretending it belongs to a customer industry.</p></div>
      </div>
      {error ? <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <div className="mt-7 flex justify-end"><button type="button" onClick={() => void enterWorkspace()} disabled={saving} className="min-h-12 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Preparing…" : "Enter operator workspace"}</button></div>
    </section>
  </div>;
}
