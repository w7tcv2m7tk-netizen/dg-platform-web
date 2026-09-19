"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Action = { label: string; href: string; detail: string };

export function FirstLoginAidaHandover({
  organisationName,
  industryLabel,
  configuredAreas,
  actions,
}: {
  organisationName: string;
  industryLabel?: string | null;
  configuredAreas: string[];
  actions: Action[];
}) {
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  if (!visible) return null;

  async function dismiss() {
    setSaving(true);
    const res = await fetch("/api/v1/onboarding/gen2/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vipSetup: { firstLoginHandoverCompletedAt: new Date().toISOString() },
      }),
    });
    if (res.ok) setVisible(false);
    setSaving(false);
  }

  return (
    <section className="mb-7 overflow-hidden rounded-[1.75rem] border border-violet-300/20 bg-gradient-to-br from-violet-950/65 via-slate-950/80 to-slate-950/90 shadow-2xl shadow-black/20">
      <div className="grid gap-5 p-5 sm:grid-cols-[190px_1fr] sm:p-7">
        <div className="flex items-end justify-center">
          <Image
            src="/aida/aida-presenting.webp"
            alt="Aida presenting your DigitalGate workspace"
            width={220}
            height={260}
            className="h-48 w-auto object-contain object-bottom sm:h-52"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Your workspace is ready</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            I’ve configured DigitalGate for {organisationName}.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            {industryLabel ? `Your ${industryLabel} operating profile` : "Your operating profile"} now drives the apps, terminology, recommendations and priorities you see by default.
          </p>
          {configuredAreas.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {configuredAreas.slice(0, 6).map((area) => (
                <span key={area} className="rounded-full border border-violet-300/15 bg-violet-500/[0.08] px-3 py-1.5 text-xs text-violet-100/80">✓ {area}</span>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {actions.slice(0, 3).map((action) => (
              <Link key={action.href + action.label} href={action.href} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-violet-300/25 hover:bg-violet-500/[0.06]">
                <p className="text-sm font-semibold text-white">{action.label} →</p>
                <p className="mt-1 text-xs leading-5 text-white/40">{action.detail}</p>
              </Link>
            ))}
          </div>
          <button type="button" disabled={saving} onClick={() => void dismiss()} className="mt-5 text-xs font-medium text-white/35 hover:text-white/60 disabled:opacity-50">
            {saving ? "Saving…" : "Got it — take me into the platform"}
          </button>
        </div>
      </div>
    </section>
  );
}
