"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  annualPriceFromMonthlyCents,
  BILLING_COMMERCIAL_CONFIG,
  GEN2_CHECKLIST_ITEMS,
  GEN2_GOAL_OPTIONS,
  GEN2_ONBOARDING_STEP_LABELS,
  GEN2_ONBOARDING_STEPS,
  GEN2_PLATFORM_PLANS,
  gen2ChecklistStats,
  type BillingCadence,
  type Gen2OnboardingProgress,
  type Gen2OnboardingStep,
  type Gen2PlatformTier,
} from "@dg/platform-core";

type ProfileDraft = {
  businessName: string;
  tradingName: string;
  abn: string;
  websiteUrl: string;
  industryVertical: string;
  phone: string;
  email: string;
  description: string;
  addressLine1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  primaryContactName: string;
  services: string;
  targetCustomers: string;
  differentiators: string;
  challenges: string;
};

const emptyProfile = (): ProfileDraft => ({
  businessName: "",
  tradingName: "",
  abn: "",
  websiteUrl: "",
  industryVertical: "",
  phone: "",
  email: "",
  description: "",
  addressLine1: "",
  city: "",
  state: "",
  postcode: "",
  country: "AU",
  primaryContactName: "",
  services: "",
  targetCustomers: "",
  differentiators: "",
  challenges: "",
});

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const INDUSTRY_APP_OPTIONS = [
  { id: "real-estate", label: "Real Estate", monthlyCents: 9900 },
  { id: "property-management", label: "Property Management", monthlyCents: 9900 },
  { id: "accommodation", label: "Accommodation", monthlyCents: 9900 },
  { id: "services", label: "Services / Trades", monthlyCents: 9900 },
  { id: "commercial", label: "Commercial", monthlyCents: 9900 },
  { id: "finance", label: "Finance", monthlyCents: 9900 },
];

const GROWTH_APP_OPTIONS = [
  { id: "prospecting", label: "Prospecting", monthlyCents: 9900 },
  { id: "seo", label: "SEO", monthlyCents: 4900 },
  { id: "ai-visibility", label: "AI Visibility", monthlyCents: 4900 },
  { id: "automation", label: "Automation", monthlyCents: 4900 },
  { id: "reviews", label: "Reputation", monthlyCents: 2900 },
];

export function Gen2OnboardingWizard({
  initial,
  founding = false,
  checkoutStatus,
}: {
  initial: Gen2OnboardingProgress;
  founding?: boolean;
  checkoutStatus?: "success" | "cancelled" | null;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const [step, setStep] = useState<Gen2OnboardingStep>(initial.currentStep);
  const [profile, setProfile] = useState<ProfileDraft>(emptyProfile);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const stepIndex = GEN2_ONBOARDING_STEPS.indexOf(step);
  const checklist = gen2ChecklistStats(progress);

  const plan = GEN2_PLATFORM_PLANS.find((p) => p.id === (progress.platformTier ?? "professional"))!;
  const cadence: BillingCadence = progress.billingCadence ?? "monthly";
  const industry = progress.industryApps ?? [];
  const premium = progress.premiumApps ?? [];

  const appsMonthly = useMemo(() => {
    let sum = 0;
    for (const id of industry) {
      sum += INDUSTRY_APP_OPTIONS.find((a) => a.id === id)?.monthlyCents ?? 9900;
    }
    for (const id of premium) {
      sum += GROWTH_APP_OPTIONS.find((a) => a.id === id)?.monthlyCents ?? 4900;
    }
    return sum;
  }, [industry, premium]);

  const platformMonthly = plan.monthlyCents;
  const totalMonthly = platformMonthly + appsMonthly;
  const totalAnnual = annualPriceFromMonthlyCents(totalMonthly);
  const displayTotal = cadence === "annual" ? totalAnnual : totalMonthly;
  const trialDays = BILLING_COMMERCIAL_CONFIG.trialDays;
  const annualSaving = totalMonthly * 12 - totalAnnual;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      if (cancelled || !res.ok) {
        setLoaded(true);
        return;
      }
      const p = json.data?.progress as Gen2OnboardingProgress | undefined;
      const prof = json.data?.profile as {
        businessName?: string;
        tradingName?: string;
        abn?: string;
        websiteUrl?: string;
        industryVertical?: string;
        businessPhone?: string;
        contactPhone?: string;
        businessEmail?: string;
        contactEmail?: string;
        contactName?: string;
        address?: {
          street?: string;
          city?: string;
          state?: string;
          postcode?: string;
          country?: string;
        };
        brandVoice?: {
          services?: string;
          targetAudience?: string;
          tagline?: string;
          competitors?: string;
        };
      } | null;
      if (p) {
        setProgress(p);
        setStep(p.currentStep);
      }
      if (prof) {
        setProfile({
          businessName: prof.businessName ?? "",
          tradingName: prof.tradingName ?? "",
          abn: prof.abn ?? "",
          websiteUrl: prof.websiteUrl ?? "",
          industryVertical: prof.industryVertical ?? "",
          phone: prof.businessPhone ?? prof.contactPhone ?? "",
          email: prof.businessEmail ?? prof.contactEmail ?? "",
          description: "",
          addressLine1: prof.address?.street ?? "",
          city: prof.address?.city ?? "",
          state: prof.address?.state ?? "",
          postcode: prof.address?.postcode ?? "",
          country: prof.address?.country ?? "AU",
          primaryContactName: prof.contactName ?? "",
          services: prof.brandVoice?.services ?? "",
          targetCustomers: prof.brandVoice?.targetAudience ?? "",
          differentiators: prof.brandVoice?.tagline ?? "",
          challenges: prof.brandVoice?.competitors ?? "",
        });
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (checkoutStatus !== "success") return;
    void (async () => {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markStepComplete: "stripe",
          progress: {
            subscriptionActivatedAt: new Date().toISOString(),
            checklist: { subscription: true },
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data?.progress) {
        setProgress(json.data.progress);
        setStep("connect");
      }
    })();
  }, [checkoutStatus]);

  const save = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/onboarding/gen2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error?.message || "Could not save progress");
          return null;
        }
        const next = json.data?.progress as Gen2OnboardingProgress;
        setProgress(next);
        if (next?.currentStep) setStep(next.currentStep);
        return next;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  async function completeWelcome() {
    await save({ markStepComplete: "welcome", progress: { founding } });
  }

  async function completeIdentity() {
    await save({
      markStepComplete: "business_identity",
      profile: {
        businessName: profile.businessName,
        tradingName: profile.tradingName,
        abn: profile.abn,
        websiteUrl: profile.websiteUrl,
        industryVertical: profile.industryVertical,
        businessPhone: profile.phone,
        businessEmail: profile.email,
        contactName: profile.primaryContactName,
        contactPhone: profile.phone,
        contactEmail: profile.email,
        address: {
          street: profile.addressLine1,
          city: profile.city,
          state: profile.state,
          postcode: profile.postcode,
          country: profile.country,
        },
      },
      progress: { checklist: { business_identity: true } },
    });
  }

  async function completeProfile() {
    await save({
      markStepComplete: "business_profile",
      profile: {
        brandVoice: {
          services: [profile.description, profile.services].filter(Boolean).join("\n\n"),
          targetAudience: profile.targetCustomers,
          tagline: profile.differentiators,
          competitors: profile.challenges,
        },
      },
      progress: { checklist: { business_profile: true } },
    });
  }

  async function completeGoals() {
    const goals = GEN2_GOAL_OPTIONS.filter((g) => selectedGoals.includes(g.id)).map((g) => ({
      id: g.id,
      title: g.label,
      label: g.label,
    }));
    await save({
      markStepComplete: "goals",
      goals,
      progress: { checklist: { goals: true } },
    });
  }

  async function completePlan(tier: Gen2PlatformTier) {
    await save({
      markStepComplete: "plan",
      progress: { platformTier: tier, checklist: { plan: true } },
    });
  }

  async function completeApps() {
    await save({
      markStepComplete: "apps",
      progress: {
        industryApps: industry,
        premiumApps: premium,
        checklist: { apps: true },
      },
    });
  }

  async function completeCadence(next: BillingCadence) {
    await save({
      markStepComplete: "billing_cadence",
      progress: { billingCadence: next },
    });
  }

  async function startCheckout() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformTier: progress.platformTier,
          billingCadence: cadence,
          industryApps: industry,
          premiumApps: premium,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data?.url) {
        setError(json.error?.message || "Could not start Stripe checkout");
        return;
      }
      window.location.assign(json.data.url as string);
    } finally {
      setSaving(false);
    }
  }

  async function completeConnect() {
    await save({
      markStepComplete: "connect",
      progress: { checklist: { connect_website: true } },
    });
  }

  async function completeChecklist() {
    await save({ markStepComplete: "checklist" });
  }

  async function completeImplementation() {
    await save({
      markStepComplete: "implementation",
      progress: { checklist: { implementation: true } },
    });
    router.push("/implementation");
  }

  function toggleApp(list: "industry" | "premium", id: string) {
    const key = list === "industry" ? "industryApps" : "premiumApps";
    const current = list === "industry" ? industry : premium;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setProgress((p) => ({ ...p, [key]: next }));
  }

  if (!loaded) {
    return (
      <main className="dg-page-main mx-auto max-w-2xl px-6 py-16 text-sm text-slate-400">
        Loading your setup…
      </main>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          {founding ? "Founding 10 · Gen 2 Onboarding" : "DigitalGate Onboarding"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {GEN2_ONBOARDING_STEP_LABELS[step]}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Step {Math.max(1, stepIndex + 1)} of {GEN2_ONBOARDING_STEPS.length} · Progress{" "}
          {checklist.done}/{checklist.total}
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{
              width: `${Math.round(((stepIndex + 1) / GEN2_ONBOARDING_STEPS.length) * 100)}%`,
            }}
          />
        </div>
      </header>

      <main className="dg-page-main mx-auto max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
        {checkoutStatus === "success" ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Your DigitalGate subscription is active. {trialDays}-day free trial has started —
            nothing charged today. Continue connecting your business below.
          </p>
        ) : null}
        {checkoutStatus === "cancelled" ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Checkout was cancelled. You can review your order and activate when ready.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        {step === "welcome" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <h2 className="text-xl font-semibold text-white">Welcome to DigitalGate</h2>
            <p className="text-sm text-slate-300">
              We&apos;ll set up your Business Operating Platform in about 15–20 minutes. You can
              leave and continue anytime — progress is saved.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
              <li>Confirm your business identity and Business Profile</li>
              <li>Choose goals, plan and Apps</li>
              <li>Activate with a {trialDays}-day free trial (card held, $0 today)</li>
              <li>Connect systems, then DigitalGate runs implementation</li>
            </ul>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeWelcome()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Let&apos;s get started
            </button>
          </section>
        ) : null}

        {step === "business_identity" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <p className="text-sm text-slate-400">
              Pre-filled from your Founding application where available. Edit anything that&apos;s
              wrong.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["businessName", "Legal business name"],
                  ["tradingName", "Trading name"],
                  ["abn", "ABN / NZBN"],
                  ["industryVertical", "Industry"],
                  ["websiteUrl", "Website"],
                  ["email", "Business email"],
                  ["phone", "Phone"],
                  ["primaryContactName", "Primary contact"],
                  ["addressLine1", "Address"],
                  ["city", "City"],
                  ["state", "State"],
                  ["postcode", "Postcode"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs text-slate-500">
                  {label}
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                    value={profile[key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={saving || !profile.businessName.trim()}
              onClick={() => void completeIdentity()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === "business_profile" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <p className="text-sm text-slate-400">
              This becomes your Business Brain foundation — Overview, Advisor, Visibility and
              Opportunity Engine all read from here.
            </p>
            {(
              [
                ["description", "Business description"],
                ["services", "Services / products"],
                ["targetCustomers", "Target customers"],
                ["differentiators", "Key differentiators"],
                ["challenges", "Current challenges / growth priorities"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs text-slate-500">
                {label}
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  value={profile[key]}
                  onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                />
              </label>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeProfile()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === "goals" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <p className="text-sm text-slate-400">
              What should DigitalGate help you achieve? These become organisation Goals.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GEN2_GOAL_OPTIONS.map((g) => {
                const on = selectedGoals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setSelectedGoals((prev) =>
                        on ? prev.filter((x) => x !== g.id) : [...prev, g.id],
                      )
                    }
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm ${
                      on
                        ? "border-sky-500 bg-sky-500/10 text-white"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving || selectedGoals.length === 0}
              onClick={() => void completeGoals()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === "plan" ? (
          <section className="space-y-4">
            {GEN2_PLATFORM_PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={saving}
                onClick={() => void completePlan(p.id)}
                className={`w-full rounded-xl border px-5 py-4 text-left ${
                  progress.platformTier === p.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-slate-700 bg-slate-950/50 hover:border-slate-500"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-white">{p.name}</h3>
                  <p className="text-sm text-sky-300">{money(p.monthlyCents)}/mo</p>
                </div>
                <p className="mt-1 text-sm text-slate-400">{p.blurb}</p>
              </button>
            ))}
          </section>
        ) : null}

        {step === "apps" ? (
          <section className="space-y-6 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <div>
              <h3 className="font-semibold text-white">Included with your plan</h3>
              <p className="mt-1 text-sm text-slate-400">
                CRM, Communications, Documents, Websites, Commerce and Opportunities ship with the
                platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white">Industry Apps</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {INDUSTRY_APP_OPTIONS.map((a) => {
                  const on = industry.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleApp("industry", a.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        on
                          ? "border-sky-500 bg-sky-500/10 text-white"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      {a.label}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        +{money(a.monthlyCents)}/mo
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white">Growth Apps</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {GROWTH_APP_OPTIONS.map((a) => {
                  const on = premium.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleApp("premium", a.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        on
                          ? "border-sky-500 bg-sky-500/10 text-white"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      {a.label}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        +{money(a.monthlyCents)}/mo
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeApps()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === "billing_cadence" ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeCadence("monthly")}
              className="rounded-xl border border-slate-700 bg-slate-950/50 px-5 py-5 text-left hover:border-sky-500"
            >
              <h3 className="font-semibold text-white">Monthly</h3>
              <p className="mt-2 text-2xl font-bold text-white">{money(totalMonthly)}</p>
              <p className="text-sm text-slate-400">per month</p>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeCadence("annual")}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-5 py-5 text-left hover:border-emerald-400"
            >
              <h3 className="font-semibold text-white">Annual</h3>
              <p className="mt-2 text-2xl font-bold text-white">{money(totalAnnual)}</p>
              <p className="text-sm text-emerald-300">
                Save {money(annualSaving)} / year (
                {BILLING_COMMERCIAL_CONFIG.annualDiscountPercent}% vs monthly)
              </p>
            </button>
          </section>
        ) : null}

        {step === "order_summary" || step === "stripe" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <h2 className="text-lg font-semibold text-white">Your DigitalGate setup</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <dt>Platform · {plan.name}</dt>
                <dd>
                  {money(
                    cadence === "annual"
                      ? annualPriceFromMonthlyCents(platformMonthly)
                      : platformMonthly,
                  )}
                  /{cadence === "annual" ? "yr" : "mo"}
                </dd>
              </div>
              <div className="flex justify-between text-slate-300">
                <dt>Apps</dt>
                <dd>
                  {money(
                    cadence === "annual"
                      ? annualPriceFromMonthlyCents(appsMonthly)
                      : appsMonthly,
                  )}
                  /{cadence === "annual" ? "yr" : "mo"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-white">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">
                  {money(displayTotal)}/{cadence === "annual" ? "yr" : "mo"}
                </dd>
              </div>
            </dl>
            <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              <p className="font-medium">{trialDays}-day free trial</p>
              <p className="mt-1 text-sky-200/90">
                Nothing is charged today. Stripe holds your payment method; billing starts after
                the trial. Cancel anytime before trial ends.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void startCheckout()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Activate subscription
            </button>
          </section>
        ) : null}

        {step === "connect" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <p className="text-sm text-slate-400">
              Connect what you use today. You can finish the rest later from Settings → Connected
              Services.
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard/settings/connections" className="text-sky-400 hover:underline">
                  Connected services →
                </Link>
              </li>
              <li>
                <Link href="/dashboard/business" className="text-sky-400 hover:underline">
                  Business Profile →
                </Link>
              </li>
              <li>
                <Link href="/apps/websites" className="text-sky-400 hover:underline">
                  Website / domain →
                </Link>
              </li>
            </ul>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeConnect()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === "checklist" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <h2 className="font-semibold text-white">Getting started</h2>
            <ul className="space-y-2 text-sm">
              {GEN2_CHECKLIST_ITEMS.map((item) => {
                const done =
                  ("step" in item &&
                    item.step &&
                    progress.completedSteps.includes(item.step)) ||
                  Boolean(progress.checklist?.[item.id]);
                return (
                  <li key={item.id} className="flex items-center gap-2 text-slate-300">
                    <span className={done ? "text-emerald-400" : "text-slate-600"}>
                      {done ? "✓" : "○"}
                    </span>
                    {item.label}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500">
              {checklist.done} / {checklist.total} complete
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeChecklist()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Continue to implementation
            </button>
          </section>
        ) : null}

        {step === "implementation" ? (
          <section className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-950/50 p-6">
            <h2 className="text-lg font-semibold text-white">Onboarding complete</h2>
            <p className="text-sm text-slate-300">
              Next: DigitalGate delivery takes over — Agreement → Kick-off → Discovery → Setup →
              Go-Live → 30-Day Review.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void completeImplementation()}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              Open implementation
            </button>
            <Link href="/dashboard" className="ml-3 text-sm text-sky-400 hover:underline">
              Business Overview
            </Link>
          </section>
        ) : null}
      </main>
    </>
  );
}
