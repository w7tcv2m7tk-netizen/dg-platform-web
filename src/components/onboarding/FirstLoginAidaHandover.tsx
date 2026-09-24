"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Action = { label: string; href: string; detail: string };

export function FirstLoginAidaHandover({
  organisationName,
  industryLabel,
  configuredAreas,
  priorities,
  actions,
}: {
  organisationName: string;
  industryLabel?: string | null;
  configuredAreas: string[];
  priorities: string[];
  actions: Action[];
}) {
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!visible) return null;

  async function dismiss() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/onboarding/gen2/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vipSetup: { firstLoginHandoverCompletedAt: new Date().toISOString() },
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error?.message ?? "I couldn’t save that yet. Please try again.");
        return;
      }
      setVisible(false);
    } catch {
      setError("I couldn’t save that yet. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-7 overflow-hidden rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-violet-950/65 via-slate-950/80 to-slate-950/90 shadow-2xl shadow-black/20">
      <div className="relative p-5 sm:p-7 lg:pr-[250px]">
        <Image
          src="/aida/aida-portrait.webp"
          alt="Aida, your DigitalGate Business Advisor"
          width={220}
          height={280}
          className="pointer-events-none absolute bottom-0 right-7 hidden h-[245px] w-auto select-none object-contain object-bottom lg:block"
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Your first day</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white">
            {organisationName} is ready. Here are the first three moves I’d make.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            {industryLabel ? `I’ve configured DigitalGate around your ${industryLabel} operating profile.` : "I’ve configured DigitalGate around your operating profile."} Your Business Brain, goals and selected apps now shape what I surface first.
          </p>
          {priorities.length ? (
            <div className="mt-5 rounded-2xl border border-violet-300/10 bg-violet-500/[0.05] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300/80">What I’ll keep an eye on</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {priorities.map((priority) => (
                  <span key={priority} className="rounded-full border border-violet-300/15 bg-black/15 px-3 py-1.5 text-xs text-violet-100/80">{priority}</span>
                ))}
              </div>
            </div>
          ) : null}
          {configuredAreas.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">Configured for you</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {configuredAreas.slice(0, 6).map((area) => (
                  <span key={area} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">✓ {area}</span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {actions.slice(0, 3).map((action, index) => (
              <Link key={action.href + action.label} href={action.href} className="min-h-28 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-violet-300/25 hover:bg-violet-500/[0.06]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300/60">Move {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-white">{action.label} →</p>
                <p className="mt-1 text-xs leading-5 text-white/40">{action.detail}</p>
              </Link>
            ))}
          </div>
          {error ? <p className="mt-4 text-xs text-amber-300">{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => void dismiss()} className="mt-5 min-h-11 rounded-full border border-white/10 px-4 text-xs font-medium text-white/55 hover:border-white/20 hover:text-white/75 disabled:opacity-50">
            {saving ? "Saving…" : "Show my Business Overview"}
          </button>
        </div>
      </div>
    </section>
  );
}
