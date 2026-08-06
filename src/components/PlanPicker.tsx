"use client";

import { useMemo, useState } from "react";
import {
  ADDONS,
  INDUSTRY_APPS,
  PLATFORM_TIERS,
  PREMIUM_APPS,
  type Addon,
  type IndustryApp,
  type PlatformTier,
  type PremiumApp,
  type SignupSelection,
} from "@/lib/plans";

type PlanPickerProps = {
  onContinue?: (selection: SignupSelection) => void;
  continueLabel?: string;
};

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function PlanPicker({ onContinue, continueLabel = "Continue to checkout" }: PlanPickerProps) {
  const [platformTier, setPlatformTier] = useState<PlatformTier | "">("");
  const [industryApps, setIndustryApps] = useState<IndustryApp[]>([]);
  const [premiumApps, setPremiumApps] = useState<PremiumApp[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  const selection = useMemo<SignupSelection>(
    () => ({ platformTier, industryApps, premiumApps, addons }),
    [platformTier, industryApps, premiumApps, addons],
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Platform tier</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORM_TIERS.map((tier) => (
            <button
              key={tier.key}
              type="button"
              onClick={() => setPlatformTier(tier.key)}
              className={`rounded-xl border p-4 text-left transition ${
                platformTier === tier.key
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-white">{tier.label}</span>
                <span className="text-sm text-blue-400">{tier.price}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{tier.tagline}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Industry apps</h2>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_APPS.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={() =>
                setIndustryApps((prev) => toggle(prev, app.key))
              }
              className={`rounded-full border px-4 py-2 text-sm transition ${
                industryApps.includes(app.key)
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {app.label}{" "}
              <span className="text-slate-500">{app.price}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Growth & Intelligence Apps</h2>
        <p className="mb-3 text-sm text-slate-500">
          SEO, AI visibility, automation, analytics, social, and voice AI
        </p>
        <div className="flex flex-wrap gap-2">
          {PREMIUM_APPS.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={() =>
                setPremiumApps((prev) => toggle(prev, app.key))
              }
              className={`rounded-full border px-4 py-2 text-sm transition ${
                premiumApps.includes(app.key)
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {app.label}{" "}
              <span className="text-slate-500">{app.price}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Platform add-ons</h2>
        <p className="mb-3 text-sm text-slate-500">Extra users and white label</p>
        <div className="flex flex-wrap gap-2">
          {ADDONS.map((addon) => (
            <button
              key={addon.key}
              type="button"
              onClick={() => setAddons((prev) => toggle(prev, addon.key))}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                addons.includes(addon.key)
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {addon.label}{" "}
              <span className="text-slate-500">{addon.price}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={!platformTier}
        onClick={() => onContinue?.(selection)}
        className="w-full rounded-full bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {continueLabel}
      </button>
    </div>
  );
}
