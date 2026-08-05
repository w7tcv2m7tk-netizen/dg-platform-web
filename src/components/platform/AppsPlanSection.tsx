"use client";

import Link from "next/link";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { PlanPicker } from "@/components/PlanPicker";
import type { SignupSelection } from "@/lib/plans";

export function AppsPlanSection() {
  const { applyPlan, resetApps, syncing, enabledIds } = useEnabledApps();

  return (
    <section id="plan" className="dg-card scroll-mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Plan & pricing</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Pick a tier and apps, then apply to preview what appears in your sidebar. Toggle
            individual apps below for fine-grained control — {enabledIds.length} app
            {enabledIds.length === 1 ? "" : "s"} currently on.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing}
            onClick={() => resetApps()}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
          >
            Reset defaults
          </button>
          <Link
            href="/signup/account"
            className="shrink-0 rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            New signup
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <PlanPicker
          continueLabel="Apply to sidebar"
          onContinue={(sel: SignupSelection) => {
            if (!sel.platformTier) return;
            void applyPlan({
              platformTier: sel.platformTier,
              industryApps: sel.industryApps,
              premiumApps: sel.premiumApps,
            });
          }}
        />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Continue applies your plan to the sidebar preview and saves to your organisation. Use
        signup for new customer checkout with business details.
      </p>
    </section>
  );
}
