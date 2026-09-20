"use client";

import { useEffect, useMemo, useState } from "react";
import type { Gen2OnboardingProgress, Gen2VipSetup } from "@dg/platform-core";

import { ContactImportExport } from "@/components/crm/ContactImportExport";
import { VipWorkAccountConnections } from "@/components/onboarding/VipWorkAccountConnections";

const TIMEZONES = [
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Adelaide",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
];

const PROVIDERS = [
  { id: "google_workspace", label: "Google Workspace", capabilities: ["contacts", "calendar", "mail"] },
  { id: "microsoft_365", label: "Microsoft 365", capabilities: ["contacts", "calendar", "mail"] },
  { id: "apple_icloud", label: "Apple / iCloud", capabilities: ["contacts", "calendar", "mail"] },
] as const;

const defaultSetup = (): Gen2VipSetup => ({
  version: 1,
  appearance: "system",
  timezone: "Australia/Brisbane",
  locale: "en-AU",
  currency: "AUD",
  connections: {},
  socialProfiles: {},
  aiAdvicePriorities: [],
  aiReportingPriorities: [],
});

function seedSetupFocus(setup: Gen2VipSetup, setupFocus?: string[]): Gen2VipSetup {
  const focus = setupFocus?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (!focus.length) return setup;

  const advice = setup.aiAdvicePriorities?.filter(Boolean) ?? [];
  const reporting = setup.aiReportingPriorities?.filter(Boolean) ?? [];
  if (advice.length && reporting.length) return setup;

  return {
    ...setup,
    aiAdvicePriorities: advice.length ? advice : focus,
    aiReportingPriorities: reporting.length ? reporting : focus,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`;
}

async function extractPalette(file: File): Promise<[string, string] | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] ?? 0;
      if (alpha < 96) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max >= 246 || max <= 14) continue;
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr}-${qg}-${qb}`;
      const current = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      current.count += 1;
      current.r += r;
      current.g += g;
      current.b += b;
      buckets.set(key, current);
    }
    const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 8);
    if (!ranked.length) return null;
    const colours = ranked.map((entry) => rgbToHex(
      Math.round(entry.r / entry.count),
      Math.round(entry.g / entry.count),
      Math.round(entry.b / entry.count),
    ));
    const primary = colours[0]!;\n    const primaryRgb = ranked[0]!;\n    const accentIndex = ranked.findIndex((entry, index) => index > 0 && Math.hypot(\n      entry.r / entry.count - primaryRgb.r / primaryRgb.count,\n      entry.g / entry.count - primaryRgb.g / primaryRgb.count,\n      entry.b / entry.count - primaryRgb.b / primaryRgb.count,\n    ) >= 70);\n    return [primary, accentIndex > 0 ? colours[accentIndex]! : primary];
  } catch {
    return null;
  }
}

export function VipPlatformSetupPanel({
  initial,
  canImportContacts,
  setupFocus,
}: {
  initial: Gen2OnboardingProgress;
  canImportContacts: boolean;
  setupFocus?: string[];
}) {
  const [setup, setSetup] = useState<Gen2VipSetup>(() => seedSetupFocus(initial.vipSetup ?? defaultSetup(), setupFocus));
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const progress = json.data?.progress as Gen2OnboardingProgress | undefined;
      if (progress?.vipSetup) setSetup(seedSetupFocus(progress.vipSetup, setupFocus));
      setLogoUrl(json.data?.profile?.logoUrl ?? "");
      setIconUrl(json.data?.profile?.iconUrl ?? "");
    })();
  }, [setupFocus]);

  const readiness = useMemo(() => {
    const checks = [
      Boolean(setup.appearance),
      Boolean(setup.timezone),
      Boolean(logoUrl || iconUrl),
      Boolean(setup.brandPrimary && setup.brandAccent),
      Boolean(setup.websiteMigrationIntent || setup.websiteDomain),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [setup, logoUrl, iconUrl]);

  async function persist(next = setup, profilePatch?: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: { vipSetup: next },
          ...(profilePatch ? { profile: profilePatch } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error?.message || "Could not save setup");
        return false;
      }
      const saved = json.data?.progress?.vipSetup as Gen2VipSetup | undefined;
      if (saved) setSetup(saved);
      setMessage("Saved");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function uploadBrandAsset(file: File, kind: "logo" | "icon") {
    setSaving(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const res = await fetch("/api/v1/onboarding/gen2/brand-asset", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data?.url) {
        setMessage(json.error?.message || "Upload failed");
        return;
      }
      if (kind === "logo") setLogoUrl(json.data.url);
      else setIconUrl(json.data.url);

      const palette = await extractPalette(file);
      if (palette) {
        const next = {
          ...setup,
          brandPrimary: palette[0],
          brandAccent: palette[1],
          brandColoursExtracted: true,
          brandColoursOverridden: false,
        };
        setSetup(next);
        const saved = await persist(next, { brandColours: palette.join(",") });\n        if (saved) setMessage("Brand colours detected: " + palette[0] + " · " + palette[1]);
      } else {
        setMessage("Brand image uploaded. We could not confidently detect colours — choose them below.");
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleProvider(provider: typeof PROVIDERS[number]) {
    const current = setup.connections?.[provider.id];
    const requested = !current?.requested;
    setSetup((previous) => ({
      ...previous,
      connections: {
        ...(previous.connections ?? {}),
        [provider.id]: {
          requested,
          requestedCapabilities: requested ? [...provider.capabilities] : [],
          status: requested ? "planned" : "not_started",
        },
      },
    }));
  }

  async function completeVipSetup() {
    const next = { ...setup, required: true, completedAt: new Date().toISOString() };
    const ok = await persist(next);
    if (ok) window.location.assign("/dashboard");
  }

  return (
    <section className="mx-4 mb-8 space-y-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:mx-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Aida · Platform preparation</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Make your platform yours before you enter</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Branding, preferences, digital presence and work-account choices are saved to your organisation so the workspace can open already configured.</p>
        </div>
        <div className="min-w-28 text-right">
          <div className="text-2xl font-semibold text-white">{readiness}%</div>
          <div className="text-xs text-white/40">setup readiness</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <h3 className="font-medium text-white">Brand & appearance</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/50">Logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBrandAsset(file, "logo"); }} className="mt-2 block w-full text-xs text-white/55" /></label>
            <label className="text-xs text-white/50">Icon<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBrandAsset(file, "icon"); }} className="mt-2 block w-full text-xs text-white/55" /></label>
          </div>
          {(logoUrl || iconUrl) ? <p className="text-xs text-emerald-300">Brand artwork uploaded ✓</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/50">Appearance<select value={setup.appearance} onChange={(e) => setSetup((p) => ({ ...p, appearance: e.target.value as Gen2VipSetup["appearance"] }))} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label>
            <label className="text-xs text-white/50">Timezone<select value={setup.timezone} onChange={(e) => setSetup((p) => ({ ...p, timezone: e.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white">{TIMEZONES.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
            <label className="text-xs text-white/50">Primary colour<input type="color" value={setup.brandPrimary ?? "#3b82f6"} onChange={(e) => setSetup((p) => ({ ...p, brandPrimary: e.target.value, brandColoursOverridden: true }))} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-transparent p-1" /></label>
            <label className="text-xs text-white/50">Accent colour<input type="color" value={setup.brandAccent ?? "#10b981"} onChange={(e) => setSetup((p) => ({ ...p, brandAccent: e.target.value, brandColoursOverridden: true }))} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-transparent p-1" /></label>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <h3 className="font-medium text-white">Website & social presence</h3>
          <label className="block text-xs text-white/50">Domain<input value={setup.websiteDomain ?? ""} onChange={(e) => setSetup((p) => ({ ...p, websiteDomain: e.target.value }))} placeholder="example.com.au" className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white" /></label>
          <label className="block text-xs text-white/50">Website plan<select value={setup.websiteMigrationIntent ?? "none"} onChange={(e) => setSetup((p) => ({ ...p, websiteMigrationIntent: e.target.value as Gen2VipSetup["websiteMigrationIntent"] }))} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white"><option value="migrate">Migrate existing website</option><option value="replace">Replace existing website</option><option value="connect">Connect existing website</option><option value="none">No website work yet</option></select></label>
          {(["googleBusiness", "facebook", "instagram", "linkedin"] as const).map((network) => <label key={network} className="block text-xs capitalize text-white/50">{network.replace(/([A-Z])/g, " $1")}<input value={setup.socialProfiles?.[network] ?? ""} onChange={(e) => setSetup((p) => ({ ...p, socialProfiles: { ...(p.socialProfiles ?? {}), [network]: e.target.value } }))} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-white" /></label>)}
        </div>
      </div>

      {(setup.aiAdvicePriorities?.length || setup.aiReportingPriorities?.length) ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
          <h3 className="font-medium text-white">Business Brain focus</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">These priorities give Aida an initial operating context. Saved organisation choices are never replaced by a concierge preset.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(setup.aiAdvicePriorities ?? []).map((item) => <span key={item} className="rounded-full border border-sky-400/20 bg-sky-500/[0.08] px-3 py-1.5 text-xs text-sky-100/80">{item}</span>)}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-white">Connections & data</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/45">Bring your existing business information into the same operating system before you enter the workspace.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Real data, not demo setup</span>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium text-white">Business contacts</div>
              <p className="mt-1 text-xs leading-5 text-white/45">Import customers, prospects, suppliers and other contacts directly into the organisation CRM.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={setup.contactImportRequested ?? false} onChange={(e) => setSetup((p) => ({ ...p, contactImportRequested: e.target.checked, contactImportFormat: e.target.checked ? (p.contactImportFormat ?? "csv") : undefined }))} /> Include contact import</label>
          </div>
          {setup.contactImportRequested ? (
            <div className="mt-4 border-t border-white/[0.07] pt-4">
              {canImportContacts ? (
                <>
                  <ContactImportExport canImport canExport={false} />
                  <p className="mt-2 text-xs text-white/40">CSV imports use the same organisation-scoped, permission-gated CRM importer as the Contacts app. Imported records are immediately available to CRM, communications and Aida.</p>
                </>
              ) : (
                <p className="text-xs leading-5 text-amber-200/80">Contact import is not enabled for your current access. Your setup choice will be saved, but DigitalGate will not claim the data has been imported.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">{PROVIDERS.map((provider) => { const on = Boolean(setup.connections?.[provider.id]?.requested); return <button type="button" key={provider.id} onClick={() => toggleProvider(provider)} className={`rounded-xl border p-4 text-left ${on ? "border-sky-400/40 bg-sky-500/10" : "border-white/10 bg-white/[0.02]"}`}><div className="font-medium text-white">{provider.label}</div><div className="mt-2 text-xs text-white/45">{provider.capabilities.join(" · ")}</div><div className="mt-3 text-xs text-sky-300">{on ? "Selected for connection" : "Select"}</div></button>; })}</div>
        <p className="mt-3 text-xs leading-5 text-white/40">Your selections tell Aida which work accounts should become part of this workspace. Mail can be connected now where the provider backend is available; contacts and calendar remain planned until their sync services are enabled.</p>
        <VipWorkAccountConnections />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
        <div className="text-xs text-white/45">{message ?? "Aida will use this configuration to prepare your customer-facing workspace and Business Brain."}</div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void persist(setup, setup.brandPrimary && setup.brandAccent ? { brandColours: `${setup.brandPrimary},${setup.brandAccent}`, social: setup.socialProfiles } : { social: setup.socialProfiles })} className="min-h-11 rounded-full border border-white/10 px-4 text-sm font-medium text-white hover:bg-white/[0.05] disabled:opacity-50">Save setup</button><button type="button" disabled={saving || readiness < 80} onClick={() => void completeVipSetup()} className="min-h-11 rounded-full bg-sky-600 px-5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40">Finish setup & enter platform</button></div>
      </div>
    </section>
  );
}
