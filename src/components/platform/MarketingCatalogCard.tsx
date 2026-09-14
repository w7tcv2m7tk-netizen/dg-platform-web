"use client";

import Link from "next/link";

import { AppInstallToggle } from "@/components/platform/AppInstallToggle";
import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";

/** Marketing is the umbrella Growth workspace; specialist Growth Apps retain their own pricing. */
export function MarketingCatalogCard() {
  const { enabledIds } = useEnabledApps();
  const installed = enabledIds.includes("marketing");

  return (
    <section className="mb-8 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl" aria-hidden>◉</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Growth · Recommended workspace
            </p>
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">Marketing</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            The umbrella Growth workspace for campaigns, audiences, funnels, lead generation,
            attribution and optimisation. SEO, AI Visibility, Reputation, Social, Automation,
            Prospecting and Analytics remain specialist Growth Apps and feed into the same growth
            operating picture.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Marketing is a workspace, not an additional paid SKU. Specialist Growth App pricing
            remains unchanged.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AppInstallToggle appId="marketing" installed={installed} />
          {installed ? (
            <Link
              href="/apps/marketing"
              className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/10"
            >
              Open Marketing
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
