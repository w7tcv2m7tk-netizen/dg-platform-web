"use client";

import { useMemo, useState } from "react";
import {
  ADDONS,
  INDUSTRY_PLATFORMS,
  PLATFORM_TIERS,
  PREMIUM_APPS,
  type Addon,
  type IndustryApp,
  type IndustryPlatformKey,
  type PlatformTier,
  type PremiumApp,
  type SignupSelection,
} from "@/lib/plans";

type PlanPickerProps = {
  onContinue?: (selection: SignupSelection) => void;
  continueLabel?: string;
};

const LAUNCH_INDUSTRY_KEYS = new Set<IndustryPlatformKey>([
  "property",
  "hospitality-accommodation",
  "services",
  "finance",
]);

const SIGNUP_INDUSTRY_PLATFORMS = INDUSTRY_PLATFORMS.filter((platform) =>
  LAUNCH_INDUSTRY_KEYS.has(platform.key),
);

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function PlanPicker({ onContinue, continueLabel = "Continue to your details" }: PlanPickerProps) {
  const [platformTier, setPlatformTier] = useState<PlatformTier | "">("");
  const [industryPlatforms, setIndustryPlatforms] = useState<IndustryPlatformKey[]>([]);
  const [premiumApps, setPremiumApps] = useState<PremiumApp[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);

  const industryApps = useMemo<IndustryApp[]>(() => {
    const apps: IndustryApp[] = [];
    for (const key of industryPlatforms) {
      const platform = SIGNUP_INDUSTRY_PLATFORMS.find((item) => item.key === key);
      if (platform?.defaultApp && !apps.includes(platform.defaultApp)) {
        apps.push(platform.defaultApp);
      }
    }
    return apps;
  }, [industryPlatforms]);

  const selection = useMemo<SignupSelection>(
    () => ({ platformTier, industryApps, premiumApps, addons }),
    [platformTier, industryApps, premiumApps, addons],
  );

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        Choose the DigitalGate plan and launch-ready apps that fit your business. We&apos;ll save
        your selection, then guide you through account setup and billing.
      </p>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Platform tier</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORM_TIERS.map((tier) => (
            <button
              key={tier.key}
              type="button"
              onClick={() => setPlatformTier(tier.key)}
              className={`min-h-11 rounded-xl border p-4 text-left transition ${
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
        <h2 className="mb-1 text-lg font-semibold text-white">Industry Apps</h2>
        <p className="mb-3 text-sm text-slate-500">
          Choose from the industry apps available now. We&apos;ll add your selected workflow to
          your onboarding journey.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIGNUP_INDUSTRY_PLATFORMS.map((platform) => (
            <button
              key={platform.key}
              type="button"
              onClick={() =>
                setIndustryPlatforms((prev) => toggle(prev, platform.key))
              }
              className={`min-h-11 rounded-xl border p-4 text-left transition ${
                industryPlatforms.includes(platform.key)
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-600"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-white">{platform.label}</span>
                <span className="text-sm text-blue-400">{platform.price}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{platform.specialisations}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Growth &amp; Intelligence Apps</h2>
        <p className="mb-3 text-sm text-slate-500">
          Add the growth and intelligence capabilities that match your priorities.
        </p>
        <div className="flex flex-wrap gap-2">
          {PREMIUM_APPS.map((app) => (
            <button
              key={app.key}
              type="button"
              onClick={() =>
                setPremiumApps((prev) => toggle(prev, app.key))
              }
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm transition ${
                premiumApps.includes(app.key)
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {app.label}{" "}
              <span className="ml-1 text-slate-500">{app.price}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-white">Platform add-ons</h2>
        <p className="mb-3 text-sm text-slate-500">Add extra users or white-label capability.</p>
        <div className="flex flex-wrap gap-2">
          {ADDONS.map((addon) => (
            <button
              key={addon.key}
              type="button"
              onClick={() => setAddons((prev) => toggle(prev, addon.key))}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm transition ${
                addons.includes(addon.key)
                  ? "border-blue-500 bg-blue-500/20 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {addon.label}{" "}
              <span className="ml-1 text-slate-500">{addon.price}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={!platformTier}
        onClick={() => onContinue?.(selection)}
        className="min-h-11 w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {continueLabel}
      </button>
    </div>
  );
}
