"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { INDUSTRY_TAXONOMY, type Gen2OnboardingProgress } from "@dg/platform-core";

type StageId = "welcome" | "business" | "industry" | "services" | "branding" | "connections" | "review";

type ProfileDraft = {
  businessName: string;
  tradingName: string;
  abn: string;
  websiteUrl: string;
  industryVertical: string;
  phone: string;
  email: string;
  primaryContactName: string;
  description: string;
  services: string;
  targetCustomers: string;
  differentiators: string;
  challenges: string;
  brandColours: string;
  logoUrl: string;
  iconUrl: string;
};

type VipSetupDraft = {
  version: 1;
  required?: boolean;
  completedAt?: string | null;
  rerunRequestedAt?: string | null;
  appearance: "system" | "dark" | "light";
  timezone: string;
  locale: string;
  currency: string;
  websiteDomain?: string;
  websiteMigrationIntent?: "migrate" | "replace" | "connect" | "none";
  brandPrimary?: string;
  brandAccent?: string;
  brandColoursExtracted?: boolean;
  brandColoursOverridden?: boolean;
  connections?: Record<string, {
    requested: boolean;
    requestedCapabilities: Array<"contacts" | "calendar" | "mail">;
    status: "not_started" | "planned" | "connected" | "attention_required";
  }>;
  socialProfiles?: Record<string, string>;
  contactImportRequested?: boolean;
  contactImportFormat?: "csv" | "vcard";
  aiAdvicePriorities?: string[];
  aiReportingPriorities?: string[];
};

const STAGES: Array<{ id: StageId; label: string }> = [
  { id: "welcome", label: "Welcome" },
  { id: "business", label: "Business" },
  { id: "industry", label: "Industry" },
  { id: "services", label: "Services" },
  { id: "branding", label: "Branding" },
  { id: "connections", label: "Connections" },
  { id: "review", label: "Review" },
];

const PROVIDERS = [
  { id: "google_workspace", label: "Google Workspace" },
  { id: "microsoft_365", label: "Microsoft 365" },
  { id: "apple_icloud", label: "Apple / iCloud" },
] as const;

const TIMEZONES = [
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Adelaide",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
];

function blankProfile(businessName: string): ProfileDraft {
  return {
    businessName,
    tradingName: "",
    abn: "",
    websiteUrl: "",
    industryVertical: "",
    phone: "",
    email: "",
    primaryContactName: "",
    description: "",
    services: "",
    targetCustomers: "",
    differentiators: "",
    challenges: "",
    brandColours: "",
    logoUrl: "",
    iconUrl: "",
  };
}

function defaultSetup(initial: Gen2OnboardingProgress, focus?: string[]): VipSetupDraft {
  const saved = (initial.vipSetup ?? {}) as Partial<VipSetupDraft>;
  const seeded = focus?.map((item) => item.trim()).filter(Boolean) ?? [];
  return {
    version: 1,
    required: true,
    completedAt: saved.completedAt ?? null,
    rerunRequestedAt: saved.rerunRequestedAt ?? null,
    appearance: saved.appearance ?? "system",
    timezone: saved.timezone ?? "Australia/Brisbane",
    locale: saved.locale ?? "en-AU",
    currency: saved.currency ?? "AUD",
    websiteDomain: saved.websiteDomain ?? "",
    websiteMigrationIntent: saved.websiteMigrationIntent ?? "none",
    brandPrimary: saved.brandPrimary ?? "#7C3AED",
    brandAccent: saved.brandAccent ?? "#C084FC",
    brandColoursExtracted: saved.brandColoursExtracted ?? false,
    brandColoursOverridden: saved.brandColoursOverridden ?? false,
    connections: saved.connections ?? {},
    socialProfiles: saved.socialProfiles ?? {},
    contactImportRequested: saved.contactImportRequested ?? false,
    contactImportFormat: saved.contactImportFormat,
    aiAdvicePriorities: saved.aiAdvicePriorities?.length ? saved.aiAdvicePriorities : seeded,
    aiReportingPriorities: saved.aiReportingPriorities?.length ? saved.aiReportingPriorities : seeded,
  };
}

function stageFromLegacy(step: string | undefined): StageId {
  if (!step || step === "welcome") return "welcome";
  if (step === "business_identity") return "business";
  if (step === "business_profile" || step === "goals") return "services";
  if (step === "plan" || step === "apps") return "industry";
  if (step === "billing_cadence" || step === "order_summary" || step === "stripe") return "review";
  if (step === "connect") return "connections";
  if (step === "checklist" || step === "implementation") return "review";
  return "welcome";
}

function fieldClass() {
  return "mt-1.5 min-h-12 w-full rounded-xl border border-violet-300/15 bg-black/25 px-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10";
}

export function UnifiedOnboardingJourney({
  initial,
  businessName,
  aidaWelcome,
  setupFocus,
  recommendedTemplate,
  checkoutStatus,
  founding,
  reviewMode = false,
}: {
  initial: Gen2OnboardingProgress;
  businessName: string;
  aidaWelcome?: string | null;
  setupFocus?: string[];
  recommendedTemplate?: string | null;
  checkoutStatus?: "success" | "cancelled" | null;
  founding?: boolean;
  reviewMode?: boolean;
}) {
  const [stage, setStage] = useState<StageId>(reviewMode ? "welcome" : stageFromLegacy(initial.currentStep));
  const [profile, setProfile] = useState<ProfileDraft>(() => blankProfile(businessName));
  const [setup, setSetup] = useState<VipSetupDraft>(() => defaultSetup(initial, setupFocus));
  const [templates, setTemplates] = useState<string[]>(() => initial.industryTemplates?.length ? initial.industryTemplates : recommendedTemplate ? [recommendedTemplate] : []);
  const [progress, setProgress] = useState(initial);
  const [commercialOffer, setCommercialOffer] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stageIndex = STAGES.findIndex((item) => item.id === stage);
  const completion = Math.round(((stageIndex + 1) / STAGES.length) * 100);

  const relevantGroups = useMemo(() => {
    const enabled = new Set(progress.industryApps ?? []);
    const matches = INDUSTRY_TAXONOMY.filter((group) => group.appIds.some((appId) => enabled.has(appId)));
    if (matches.length) return matches;
    if (recommendedTemplate) {
      const match = INDUSTRY_TAXONOMY.find((group) => group.subIndustries.some((sub) => sub.id === recommendedTemplate));
      if (match) return [match];
    }
    return INDUSTRY_TAXONOMY;
  }, [progress.industryApps, recommendedTemplate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error?.message || "We couldn't load your saved setup.");
        setLoaded(true);
        return;
      }
      const p = json.data?.progress as Gen2OnboardingProgress | undefined;
      const saved = json.data?.profile ?? {};
      if (p) {
        setProgress(p);
        setSetup(defaultSetup(p, setupFocus));
        if (!reviewMode) setStage(stageFromLegacy(p.currentStep));
        if (p.industryTemplates?.length) setTemplates(p.industryTemplates);
      }
      setCommercialOffer(json.data?.commercialOffer ?? null);
      setProfile({
        businessName: saved.businessName ?? businessName,
        tradingName: saved.tradingName ?? "",
        abn: saved.abn ?? "",
        websiteUrl: saved.websiteUrl ?? "",
        industryVertical: saved.industryVertical ?? "",
        phone: saved.businessPhone ?? saved.contactPhone ?? "",
        email: saved.businessEmail ?? saved.contactEmail ?? "",
        primaryContactName: saved.contactName ?? "",
        description: saved.brandVoice?.tone ?? "",
        services: saved.brandVoice?.services ?? "",
        targetCustomers: saved.brandVoice?.targetAudience ?? "",
        differentiators: saved.brandVoice?.tagline ?? "",
        challenges: saved.brandVoice?.competitors ?? "",
        brandColours: saved.brandColours ?? "",
        logoUrl: saved.logoUrl ?? "",
        iconUrl: saved.iconUrl ?? "",
      });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [businessName, reviewMode, setupFocus]);

  useEffect(() => {
    if (checkoutStatus === "success") setStage("review");
  }, [checkoutStatus]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error?.message || "Could not save setup");
        return null;
      }
      if (json.data?.progress) setProgress(json.data.progress);
      return json.data?.progress as Gen2OnboardingProgress | undefined;
    } finally {
      setSaving(false);
    }
  }

  async function mark(step: string, extra: Record<string, unknown> = {}) {
    return patch({ ...extra, markStepComplete: step });
  }

  function goBack() {
    if (stageIndex > 0) {
      setError(null);
      setMessage(null);
      setStage(STAGES[stageIndex - 1]!.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function goNext() {
    setMessage(null);
    if (stage === "welcome") {
      const saved = await mark("welcome", { progress: { vipSetup: setup, founding } });
      if (!saved) return;
    }
    if (stage === "business") {
      if (!profile.businessName.trim() || !profile.email.trim()) {
        setError("Add your business name and email before continuing.");
        return;
      }
      const saved = await mark("business_identity", {
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
        },
      });
      if (!saved) return;
    }
    if (stage === "industry") {
      if (!templates.length) {
        setError("Choose the business type that best matches how you operate.");
        return;
      }
      const saved = await patch({ progress: { industryTemplates: templates } });
      if (!saved) return;
    }
    if (stage === "services") {
      if (!profile.services.trim() || !profile.targetCustomers.trim()) {
        setError("Add your services/products and target customers before continuing.");
        return;
      }
      const saved = await mark("business_profile", {
        profile: {
          brandVoice: {
            tone: profile.description,
            services: profile.services,
            targetAudience: profile.targetCustomers,
            tagline: profile.differentiators,
            competitors: profile.challenges,
          },
        },
      });
      if (!saved) return;
    }
    if (stage === "branding") {
      const brandColours = `${setup.brandPrimary ?? "#7C3AED"}, ${setup.brandAccent ?? "#C084FC"}`;
      const saved = await patch({
        profile: { brandColours },
        progress: { vipSetup: setup, industryTemplates: templates },
      });
      if (!saved) return;
      setProfile((current) => ({ ...current, brandColours }));
    }
    if (stage === "connections") {
      const saved = await patch({ progress: { vipSetup: setup } });
      if (!saved) return;
    }
    if (stageIndex < STAGES.length - 1) {
      setStage(STAGES[stageIndex + 1]!.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function selectTemplate(id: string, appId: string) {
    const siblings = new Set(
      INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries)
        .filter((sub) => sub.appId === appId)
        .map((sub) => sub.id),
    );
    setTemplates((current) => [...current.filter((item) => !siblings.has(item)), id]);
  }

  async function uploadBrandAsset(file: File, kind: "logo" | "icon") {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const res = await fetch("/api/v1/onboarding/gen2/brand-asset", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data?.url) {
        setError(json.error?.message || "Upload failed");
        return;
      }
      setProfile((current) => ({ ...current, [kind === "logo" ? "logoUrl" : "iconUrl"]: json.data.url }));
      setMessage(`${kind === "logo" ? "Logo" : "Icon"} uploaded.`);
    } finally {
      setSaving(false);
    }
  }

  function toggleProvider(id: string) {
    const current = setup.connections?.[id];
    const requested = !current?.requested;
    setSetup((previous) => ({
      ...previous,
      connections: {
        ...(previous.connections ?? {}),
        [id]: {
          requested,
          requestedCapabilities: requested ? ["contacts", "calendar", "mail"] : [],
          status: requested ? "planned" : "not_started",
        },
      },
    }));
  }

  async function prepareCheckout() {
    setSaving(true);
    setError(null);
    try {
      for (const step of ["goals", "plan", "apps", "billing_cadence"]) {
        const res = await fetch("/api/v1/onboarding/gen2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markStepComplete: step }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error?.message || "Could not prepare subscription setup");
          return;
        }
      }
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformTier: progress.platformTier,
          billingCadence: progress.billingCadence,
          industryApps: progress.industryApps,
          premiumApps: progress.premiumApps,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data?.url) {
        setError(json.error?.message || "Could not start subscription checkout");
        return;
      }
      window.location.assign(json.data.url);
    } finally {
      setSaving(false);
    }
  }

  async function finishSetup() {
    setSaving(true);
    setError(null);
    try {
      if (checkoutStatus === "success") {
        const stripe = await fetch("/api/v1/onboarding/gen2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markStepComplete: "stripe" }),
        });
        if (!stripe.ok) {
          const json = await stripe.json().catch(() => ({}));
          setError(json.error?.message || "Subscription confirmation is still pending.");
          return;
        }
      }

      const completedSetup = { ...setup, required: true, completedAt: new Date().toISOString() };
      const saved = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { brandColours: `${completedSetup.brandPrimary}, ${completedSetup.brandAccent}` },
          progress: { vipSetup: completedSetup, industryTemplates: templates },
        }),
      });
      const savedJson = await saved.json().catch(() => ({}));
      if (!saved.ok) {
        setError(savedJson.error?.message || "Aida still needs a few setup details before we finish.");
        return;
      }

      for (const step of ["connect", "checklist", "implementation"]) {
        const res = await fetch("/api/v1/onboarding/gen2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markStepComplete: step }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error?.message || "Could not complete setup");
          return;
        }
      }
      window.location.assign(reviewMode ? "/dashboard" : "/implementation");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div className="mx-auto max-w-xl py-20 text-center text-sm text-white/45">Aida is loading your saved setup…</div>;
  }

  const card = "mx-auto w-full max-w-3xl rounded-[2rem] border border-violet-300/15 bg-[#120b20]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8";
  const label = "text-xs font-semibold uppercase tracking-[0.18em] text-violet-300";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto mb-7 max-w-3xl">
        <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-medium text-white/35">
          <span>{STAGES[stageIndex]?.label}</span>
          <span>{stageIndex + 1} of {STAGES.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-400 transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
        <div className="mt-3 hidden grid-cols-7 gap-2 text-center text-[10px] text-white/25 md:grid">
          {STAGES.map((item, index) => <span key={item.id} className={index <= stageIndex ? "text-violet-300/80" : ""}>{item.label}</span>)}
        </div>
      </div>

      {stage === "welcome" ? (
        <section className={`${card} text-center`}>
          <div className="mx-auto flex h-44 w-44 items-end justify-center sm:h-52 sm:w-52">
            <Image src="/aida/aida-welcome.webp" alt="Aida, your DigitalGate AI business partner" width={420} height={420} priority className="max-h-full w-auto object-contain object-bottom drop-shadow-2xl" />
          </div>
          <p className={`${label} mt-5`}>Aida · Your AI Business Partner</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Welcome to {profile.businessName || businessName}.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            {aidaWelcome ?? `Let’s set up your workspace. In a few focused steps, I’ll tailor DigitalGate around your business so you can centralise operations, attract more leads and accelerate growth.`}
          </p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {["Tailored around your business goals", "Only relevant apps and workflows", "Your Business Brain configured from day one", "A structured foundation ready for growth"].map((item) => (
              <div key={item} className="rounded-xl border border-violet-300/10 bg-violet-400/[0.045] px-4 py-3 text-sm text-white/65">✓ {item}</div>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/30">Usually 5–10 minutes · Progress saves automatically</p>
        </section>
      ) : null}

      {stage === "business" ? (
        <section className={card}>
          <p className={label}>Business</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Tell me about the business.</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">This becomes the foundation Aida and your Business Brain use across DigitalGate.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-white/50">Business name<input className={fieldClass()} value={profile.businessName} onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))} /></label>
            <label className="text-xs text-white/50">Trading name<input className={fieldClass()} value={profile.tradingName} onChange={(e) => setProfile((p) => ({ ...p, tradingName: e.target.value }))} /></label>
            <label className="text-xs text-white/50">Primary contact<input className={fieldClass()} value={profile.primaryContactName} onChange={(e) => setProfile((p) => ({ ...p, primaryContactName: e.target.value }))} /></label>
            <label className="text-xs text-white/50">Email<input type="email" className={fieldClass()} value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></label>
            <label className="text-xs text-white/50">Phone<input className={fieldClass()} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></label>
            <label className="text-xs text-white/50">ABN<input className={fieldClass()} value={profile.abn} onChange={(e) => setProfile((p) => ({ ...p, abn: e.target.value }))} /></label>
            <label className="text-xs text-white/50 sm:col-span-2">Website<input className={fieldClass()} value={profile.websiteUrl} placeholder="https://" onChange={(e) => setProfile((p) => ({ ...p, websiteUrl: e.target.value }))} /></label>
          </div>
        </section>
      ) : null}

      {stage === "industry" ? (
        <section className={card}>
          <p className={label}>Industry</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">What kind of business are we building?</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Choose the operating profile that best describes the business. This controls terminology, workflows and which specialised apps feel native to you.</p>
          <div className="mt-7 space-y-6">
            {relevantGroups.map((group) => (
              <div key={group.id}>
                <h2 className="mb-3 text-sm font-semibold text-white/70">{group.name}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.subIndustries.map((sub) => {
                    const selected = templates.includes(sub.id);
                    return <button key={sub.id} type="button" onClick={() => selectTemplate(sub.id, sub.appId)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-violet-400/55 bg-violet-500/10 shadow-lg shadow-violet-950/20" : "border-white/[0.08] bg-black/20 hover:border-violet-300/25"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="font-medium text-white">{sub.name}</span><span className={selected ? "text-violet-300" : "text-white/20"}>{selected ? "✓" : "○"}</span></div>
                      <p className="mt-2 text-xs leading-5 text-white/40">{sub.description}</p>
                    </button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "services" ? (
        <section className={card}>
          <p className={label}>Services & customers</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Help Aida understand how you create value.</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Keep it practical. This context shapes recommendations, automations, lead generation and reporting.</p>
          <div className="mt-7 space-y-4">
            <label className="block text-xs text-white/50">Business description<textarea rows={3} className={fieldClass()} value={profile.description} onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} /></label>
            <label className="block text-xs text-white/50">Services / products<textarea rows={3} className={fieldClass()} value={profile.services} onChange={(e) => setProfile((p) => ({ ...p, services: e.target.value }))} /></label>
            <label className="block text-xs text-white/50">Target customers<textarea rows={3} className={fieldClass()} value={profile.targetCustomers} onChange={(e) => setProfile((p) => ({ ...p, targetCustomers: e.target.value }))} /></label>
            <label className="block text-xs text-white/50">Key differentiators<textarea rows={2} className={fieldClass()} value={profile.differentiators} onChange={(e) => setProfile((p) => ({ ...p, differentiators: e.target.value }))} /></label>
            <label className="block text-xs text-white/50">Current challenges / growth priorities<textarea rows={2} className={fieldClass()} value={profile.challenges} onChange={(e) => setProfile((p) => ({ ...p, challenges: e.target.value }))} /></label>
          </div>
        </section>
      ) : null}

      {stage === "branding" ? (
        <section className={card}>
          <p className={label}>Branding</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Make the workspace yours.</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Your organisation brand stays distinct from the DigitalGate product identity.</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-xs text-white/50">Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadBrandAsset(file, "logo"); }} className="mt-3 block w-full text-xs text-white/55" />{profile.logoUrl ? <span className="mt-2 block text-emerald-300">Uploaded ✓</span> : null}</label>
            <label className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-xs text-white/50">Icon<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadBrandAsset(file, "icon"); }} className="mt-3 block w-full text-xs text-white/55" />{profile.iconUrl ? <span className="mt-2 block text-emerald-300">Uploaded ✓</span> : null}</label>
            <label className="text-xs text-white/50">Primary colour<input type="color" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 p-1" value={setup.brandPrimary ?? "#7C3AED"} onChange={(e) => setSetup((p) => ({ ...p, brandPrimary: e.target.value, brandColoursOverridden: true }))} /></label>
            <label className="text-xs text-white/50">Accent colour<input type="color" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 p-1" value={setup.brandAccent ?? "#C084FC"} onChange={(e) => setSetup((p) => ({ ...p, brandAccent: e.target.value, brandColoursOverridden: true }))} /></label>
            <label className="text-xs text-white/50">Appearance<select className={fieldClass()} value={setup.appearance} onChange={(e) => setSetup((p) => ({ ...p, appearance: e.target.value as VipSetupDraft["appearance"] }))}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
            <label className="text-xs text-white/50">Timezone<select className={fieldClass()} value={setup.timezone} onChange={(e) => setSetup((p) => ({ ...p, timezone: e.target.value }))}>{TIMEZONES.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
            <label className="text-xs text-white/50 sm:col-span-2">Website domain<input className={fieldClass()} value={setup.websiteDomain ?? ""} onChange={(e) => setSetup((p) => ({ ...p, websiteDomain: e.target.value }))} /></label>
          </div>
        </section>
      ) : null}

      {stage === "connections" ? (
        <section className={card}>
          <p className={label}>Connections</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Connect the tools your business already uses.</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Choose what you want DigitalGate prepared to connect. You can authorise accounts now or later from Settings.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {PROVIDERS.map((provider) => {
              const on = setup.connections?.[provider.id]?.requested === true;
              return <button key={provider.id} type="button" onClick={() => toggleProvider(provider.id)} className={`rounded-2xl border p-5 text-left transition ${on ? "border-violet-400/55 bg-violet-500/10" : "border-white/[0.08] bg-black/20 hover:border-violet-300/25"}`}><div className="flex items-center justify-between gap-3"><span className="font-medium text-white">{provider.label}</span><span className={on ? "text-violet-300" : "text-white/20"}>{on ? "✓" : "○"}</span></div><p className="mt-2 text-xs leading-5 text-white/40">Contacts · Calendar · Mail</p></button>;
            })}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-white/50">LinkedIn<input className={fieldClass()} value={setup.socialProfiles?.linkedin ?? ""} onChange={(e) => setSetup((p) => ({ ...p, socialProfiles: { ...(p.socialProfiles ?? {}), linkedin: e.target.value } }))} /></label>
            <label className="text-xs text-white/50">Google Business Profile<input className={fieldClass()} value={setup.socialProfiles?.googleBusiness ?? ""} onChange={(e) => setSetup((p) => ({ ...p, socialProfiles: { ...(p.socialProfiles ?? {}), googleBusiness: e.target.value } }))} /></label>
          </div>
          {setupFocus?.length ? <div className="mt-6 rounded-2xl border border-violet-300/10 bg-violet-400/[0.04] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Business Brain focus</p><div className="mt-3 flex flex-wrap gap-2">{setupFocus.map((item) => <span key={item} className="rounded-full border border-violet-300/15 px-3 py-1.5 text-xs text-violet-100/70">{item}</span>)}</div></div> : null}
        </section>
      ) : null}

      {stage === "review" ? (
        <section className={card}>
          <p className={label}>Review</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Your DigitalGate workspace is ready to prepare.</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">Review the foundation below. You can go back to any previous screen without losing saved operational data.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[ ["Business", profile.businessName], ["Business type", templates.join(", ") || "Not selected"], ["Services", profile.services || "Not added"], ["Target customers", profile.targetCustomers || "Not added"], ["Brand", `${setup.brandPrimary} · ${setup.brandAccent}`], ["Timezone", setup.timezone] ].map(([title, value]) => <div key={title} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">{title}</p><p className="mt-2 text-sm leading-6 text-white/70">{value}</p></div>)}
          </div>
          {commercialOffer ? <div className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] p-4 text-sm text-white/60">Your agreed DigitalGate commercial terms are attached to this organisation and will be honoured at checkout.</div> : null}
          {checkoutStatus === "cancelled" ? <p className="mt-4 text-sm text-amber-300">Checkout was cancelled. Your setup has been saved.</p> : null}
          <div className="mt-7 flex flex-wrap justify-end gap-3">
            {reviewMode || checkoutStatus === "success" ? <button type="button" disabled={saving} onClick={() => void finishSetup()} className="min-h-12 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:opacity-40">{saving ? "Finishing…" : reviewMode ? "Save setup" : "Finish setup"}</button> : <button type="button" disabled={saving} onClick={() => void prepareCheckout()} className="min-h-12 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:opacity-40">{saving ? "Preparing…" : "Continue to subscription"}</button>}
          </div>
        </section>
      ) : null}

      {(error || message) ? <div className={`mx-auto mt-4 max-w-3xl rounded-xl border px-4 py-3 text-sm ${error ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>{error ?? message}</div> : null}

      <div className="mx-auto mt-6 flex max-w-3xl items-center justify-between gap-3">
        <button type="button" onClick={goBack} disabled={stageIndex === 0 || saving} className="min-h-12 rounded-full border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-white/65 hover:bg-white/[0.07] disabled:invisible">Back</button>
        {stage !== "review" ? <button type="button" onClick={() => void goNext()} disabled={saving} className="min-h-12 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:opacity-40">{saving ? "Saving…" : stage === "welcome" ? "Begin setup" : "Next"}</button> : null}
      </div>
    </div>
  );
}
