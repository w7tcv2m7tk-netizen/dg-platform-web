"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  BusinessContext,
  BusinessBankDetails,
  OrganisationBusinessProfile,
} from "@dg/platform-core";

import { BrandAssetsEditor } from "@/components/platform/BrandAssetsEditor";
import { AuPhoneInput } from "@/components/ui/AuPhoneInput";

const PAY_ID_TYPES: Array<{
  value: NonNullable<BusinessBankDetails["payIdType"]>;
  label: string;
}> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Mobile" },
  { value: "abn", label: "ABN" },
  { value: "organisation", label: "Organisation ID" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function TwinPanel({ context }: { context: BusinessContext }) {
  const { twin } = context;
  const items = [
    { label: "Website health", value: twin.websiteHealth, suffix: "/100" },
    { label: "AI Visibility", value: twin.aiVisibility, suffix: "/100" },
    { label: "SEO", value: twin.seo, suffix: "/100" },
    { label: "Contacts", value: twin.contactCount },
    { label: "Active leads", value: twin.activeLeads },
    { label: "Connected systems", value: twin.connectedSystems.length },
  ].filter((i) => i.value != null && i.value !== 0);

  if (!items.length) {
    return (
      <p className="text-sm text-slate-500">
        Digital Twin signals appear here as apps and connectors gather data.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {item.value}
            {item.suffix ?? ""}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AiQuickActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  async function run(action: "social_post" | "email_draft" | "briefing") {
    setLoading(action);
    setOutput(null);
    const res = await fetch("/api/v1/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => null);
    setLoading(null);
    if (!res.ok) {
      setOutput(json?.error?.message ?? "Generation failed");
      return;
    }
    setOutput(json.data.output as string);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        AI uses your Business Profile automatically — no prompting required.
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["social_post", "Generate social post"],
            ["email_draft", "Draft follow-up email"],
            ["briefing", "Daily briefing"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={loading !== null}
            onClick={() => run(action)}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-blue-500 hover:text-white disabled:opacity-50"
          >
            {loading === action ? "Generating…" : label}
          </button>
        ))}
      </div>
      {output ? (
        <pre className="max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm whitespace-pre-wrap text-slate-300">
          {output}
        </pre>
      ) : null}
    </div>
  );
}

export function BusinessProfileEditor({
  profile: initialProfile,
  context,
  linked,
  focusBrand = false,
  brandIntent,
}: {
  profile: OrganisationBusinessProfile | null;
  context: BusinessContext;
  linked: boolean;
  focusBrand?: boolean;
  brandIntent?: string | null;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<OrganisationBusinessProfile>(
    initialProfile ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lookingUp, setLookingUp] = useState<"abn" | "acn" | null>(null);
  const [message, setMessage] = useState<string | null>(
    focusBrand
      ? brandIntent === "ai"
        ? "Brand Studio entry: refine colours/logo here. Full AI brand generation is next — then return to Websites to create your site."
        : "Upload or confirm logo and colours, Save, then return to Websites → Create."
      : null,
  );

  useEffect(() => {
    if (!focusBrand || typeof document === "undefined") return;
    const el = document.getElementById("brand-assets");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusBrand]);

  function setField<K extends keyof OrganisationBusinessProfile>(
    key: K,
    value: OrganisationBusinessProfile[K],
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function applyProfilePatch(patch: Partial<OrganisationBusinessProfile> | null) {
    if (!patch) return;
    setProfile((prev) => ({
      ...prev,
      ...patch,
      address: { ...prev.address, ...patch.address },
      taxSettings: { ...prev.taxSettings, ...patch.taxSettings },
      businessName: prev.businessName?.trim()
        ? prev.businessName
        : patch.businessName,
      tradingName: prev.tradingName?.trim()
        ? prev.tradingName
        : patch.tradingName,
    }));
  }

  async function lookupAbn() {
    const abn = profile.abn?.trim() ?? "";
    if (!abn) {
      setMessage("Enter an ABN to verify");
      return;
    }
    setLookingUp("abn");
    setMessage(null);
    const res = await fetch(
      `/api/v1/business-identity/abn?abn=${encodeURIComponent(abn)}`,
    );
    const json = await res.json().catch(() => null);
    setLookingUp(null);
    if (!res.ok) {
      setMessage(
        json?.data?.abr?.message ||
          json?.error?.message ||
          "ABN lookup failed — check ABR GUID in server .env.local",
      );
      return;
    }
    applyProfilePatch(json?.data?.profilePatch ?? null);
    const name = json?.data?.identity?.entity?.legalName;
    setMessage(
      name
        ? `ABN verified — ${name}. Review fields then Save.`
        : "ABN verified. Review fields then Save.",
    );
  }

  async function lookupAcn() {
    const acn = profile.acn?.trim() ?? "";
    if (!acn) {
      setMessage("Enter an ACN to look up");
      return;
    }
    setLookingUp("acn");
    setMessage(null);
    const res = await fetch(
      `/api/v1/business-identity/acn?acn=${encodeURIComponent(acn)}`,
    );
    const json = await res.json().catch(() => null);
    setLookingUp(null);
    if (!res.ok) {
      setMessage(
        json?.data?.abr?.message ||
          json?.error?.message ||
          "ACN lookup failed — check ABR GUID in server .env.local",
      );
      return;
    }
    applyProfilePatch(json?.data?.profilePatch ?? null);
    const name = json?.data?.identity?.entity?.legalName;
    setMessage(
      name
        ? `ACN matched — ${name}. Review fields then Save.`
        : "ACN matched. Review fields then Save.",
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/v1/org/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setMessage(json?.error?.message ?? "Save failed");
      return;
    }
    setMessage("Business Profile saved");
    router.refresh();
  }

  async function syncFromOnboarding() {
    setSyncing(true);
    setMessage(null);
    const res = await fetch("/api/v1/org/profile", { method: "POST" });
    const json = await res.json().catch(() => null);
    setSyncing(false);
    if (!res.ok) {
      setMessage(json?.error?.message ?? "Sync failed");
      return;
    }
    if (json.data.profile) setProfile(json.data.profile);
    setMessage(json.data.synced ? "Synced from onboarding" : "Already up to date");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Digital Business Identity
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {context.identity.businessName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              The central record every app and AI capability builds on — your Digital Twin™
              foundation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {linked ? (
              <button
                type="button"
                onClick={syncFromOnboarding}
                disabled={syncing}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "Pull from onboarding"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-400/90">{message}</p> : null}
      </section>

      <div
        id="brand-assets"
        className={
          focusBrand
            ? "rounded-xl ring-2 ring-sky-500/50 ring-offset-2 ring-offset-slate-950"
            : undefined
        }
      >
        <BrandAssetsEditor
          profile={profile}
          onChange={(patch) => setProfile((prev) => ({ ...prev, ...patch }))}
        />
        {focusBrand ? (
          <p className="mt-3 text-sm text-slate-400">
            Done?{" "}
            <a href="/apps/websites" className="text-sky-400 hover:underline">
              Return to Websites → Create
            </a>
          </p>
        ) : null}
      </div>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Identity</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <input
              className={inputClass}
              value={profile.businessName ?? ""}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </Field>
          <Field label="Trading name">
            <input
              className={inputClass}
              value={profile.tradingName ?? ""}
              onChange={(e) => setField("tradingName", e.target.value)}
            />
          </Field>
          <Field label="Industry">
            <input
              className={inputClass}
              value={profile.industryVertical ?? ""}
              onChange={(e) => setField("industryVertical", e.target.value)}
            />
          </Field>
          <Field label="Website">
            <input
              className={inputClass}
              value={profile.websiteUrl ?? ""}
              onChange={(e) => setField("websiteUrl", e.target.value)}
            />
          </Field>
          <Field label="ABN">
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={profile.abn ?? ""}
                onChange={(e) => setField("abn", e.target.value)}
                placeholder="11 digits"
              />
              <button
                type="button"
                onClick={lookupAbn}
                disabled={lookingUp !== null}
                className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-white disabled:opacity-50"
              >
                {lookingUp === "abn" ? "Looking up…" : "Verify ABN"}
              </button>
            </div>
          </Field>
          <Field label="ACN">
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={profile.acn ?? ""}
                onChange={(e) => setField("acn", e.target.value)}
                placeholder="9 digits"
              />
              <button
                type="button"
                onClick={lookupAcn}
                disabled={lookingUp !== null}
                className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-white disabled:opacity-50"
              >
                {lookingUp === "acn" ? "Looking up…" : "Look up ACN"}
              </button>
            </div>
          </Field>
          <Field label="Timezone">
            <input
              className={inputClass}
              placeholder="Australia/Brisbane"
              value={profile.businessHours?.timezone ?? ""}
              onChange={(e) =>
                setField("businessHours", {
                  ...profile.businessHours,
                  timezone: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Business hours">
            <input
              className={inputClass}
              placeholder="Mon–Fri 9am–5pm"
              value={profile.businessHours?.schedule ?? ""}
              onChange={(e) =>
                setField("businessHours", {
                  ...profile.businessHours,
                  schedule: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Business address</h3>
        <p className="mt-1 text-sm text-slate-400">
          Shown on tax invoices and quotes.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Street">
            <input
              className={inputClass}
              value={profile.address?.street ?? ""}
              onChange={(e) =>
                setField("address", { ...profile.address, street: e.target.value })
              }
            />
          </Field>
          <Field label="City / suburb">
            <input
              className={inputClass}
              value={profile.address?.city ?? ""}
              onChange={(e) =>
                setField("address", { ...profile.address, city: e.target.value })
              }
            />
          </Field>
          <Field label="State">
            <input
              className={inputClass}
              value={profile.address?.state ?? ""}
              onChange={(e) =>
                setField("address", { ...profile.address, state: e.target.value })
              }
            />
          </Field>
          <Field label="Postcode">
            <input
              className={inputClass}
              value={profile.address?.postcode ?? ""}
              onChange={(e) =>
                setField("address", { ...profile.address, postcode: e.target.value })
              }
            />
          </Field>
          <Field label="Country">
            <input
              className={inputClass}
              placeholder="Australia"
              value={profile.address?.country ?? ""}
              onChange={(e) =>
                setField("address", { ...profile.address, country: e.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">GST & invoicing defaults</h3>
        <p className="mt-1 text-sm text-slate-400">
          AU Country Pack defaults — used when creating quotes and invoices.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={profile.taxSettings?.gstRegistered ?? Boolean(profile.abn)}
              onChange={(e) =>
                setField("taxSettings", {
                  ...profile.taxSettings,
                  gstRegistered: e.target.checked,
                  country: profile.taxSettings?.country ?? "AU",
                  defaultTaxRateBps: e.target.checked
                    ? profile.taxSettings?.defaultTaxRateBps ?? 1000
                    : 0,
                })
              }
            />
            Registered for GST
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={profile.taxSettings?.pricesIncludeTax ?? false}
              onChange={(e) =>
                setField("taxSettings", {
                  ...profile.taxSettings,
                  pricesIncludeTax: e.target.checked,
                })
              }
            />
            Prices include GST by default
          </label>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Bank / payment details</h3>
        <p className="mt-1 text-sm text-slate-400">
          Printed on invoices for EFT and PayID remittance.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Bank name">
            <input
              className={inputClass}
              value={profile.bankDetails?.bankName ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  bankName: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Account name">
            <input
              className={inputClass}
              value={profile.bankDetails?.accountName ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  accountName: e.target.value,
                })
              }
            />
          </Field>
          <Field label="BSB">
            <input
              className={inputClass}
              placeholder="000-000"
              value={profile.bankDetails?.bsb ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  bsb: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Account number">
            <input
              className={inputClass}
              value={profile.bankDetails?.accountNumber ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  accountNumber: e.target.value,
                })
              }
            />
          </Field>
          <Field label="PayID">
            <input
              className={inputClass}
              placeholder="email, mobile, or ABN"
              value={profile.bankDetails?.payId ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  payId: e.target.value,
                })
              }
            />
          </Field>
          <Field label="PayID type">
            <select
              className={inputClass}
              value={profile.bankDetails?.payIdType ?? ""}
              onChange={(e) => {
                const value = e.target.value as
                  | BusinessBankDetails["payIdType"]
                  | "";
                setField("bankDetails", {
                  ...profile.bankDetails,
                  payIdType: value || undefined,
                });
              }}
            >
              <option value="">Not specified</option>
              {PAY_ID_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment reference hint">
            <input
              className={inputClass}
              placeholder="Please quote invoice number"
              value={profile.bankDetails?.paymentReferenceHint ?? ""}
              onChange={(e) =>
                setField("bankDetails", {
                  ...profile.bankDetails,
                  paymentReferenceHint: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Contact information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Primary contact">
            <input
              className={inputClass}
              value={profile.contactName ?? ""}
              onChange={(e) => setField("contactName", e.target.value)}
            />
          </Field>
          <Field label="Role">
            <input
              className={inputClass}
              value={profile.position ?? ""}
              onChange={(e) => setField("position", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <AuPhoneInput
              className={inputClass}
              placeholder="0412 345 678"
              value={profile.businessPhone ?? profile.contactPhone ?? ""}
              onValueChange={(v) => setField("businessPhone", v)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              value={profile.businessEmail ?? profile.contactEmail ?? ""}
              onChange={(e) => setField("businessEmail", e.target.value)}
            />
          </Field>
          <Field label="Support email">
            <input
              className={inputClass}
              value={profile.supportEmail ?? ""}
              onChange={(e) => setField("supportEmail", e.target.value)}
            />
          </Field>
          <Field label="Support phone">
            <AuPhoneInput
              className={inputClass}
              placeholder="02 1234 5678"
              value={profile.supportPhone ?? ""}
              onValueChange={(v) => setField("supportPhone", v)}
            />
          </Field>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Online presence</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["googleBusiness", "Google Business Profile"],
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["linkedin", "LinkedIn"],
              ["youtube", "YouTube"],
              ["tiktok", "TikTok"],
              ["x", "X"],
              ["pinterest", "Pinterest"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className={inputClass}
                value={profile.social?.[key] ?? ""}
                onChange={(e) =>
                  setField("social", { ...profile.social, [key]: e.target.value })
                }
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Brand voice (powers AI)</h3>
        <p className="mt-1 text-sm text-slate-400">
          The AI assistant reads these fields automatically when generating content.
        </p>
        <div className="mt-4 grid gap-4">
          <Field label="Tagline">
            <input
              className={inputClass}
              value={profile.brandVoice?.tagline ?? ""}
              onChange={(e) =>
                setField("brandVoice", { ...profile.brandVoice, tagline: e.target.value })
              }
            />
          </Field>
          <Field label="Tone">
            <input
              className={inputClass}
              placeholder="Professional, warm, expert"
              value={profile.brandVoice?.tone ?? ""}
              onChange={(e) =>
                setField("brandVoice", { ...profile.brandVoice, tone: e.target.value })
              }
            />
          </Field>
          <Field label="Services">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={profile.brandVoice?.services ?? ""}
              onChange={(e) =>
                setField("brandVoice", { ...profile.brandVoice, services: e.target.value })
              }
            />
          </Field>
          <Field label="Target audience">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={profile.brandVoice?.targetAudience ?? ""}
              onChange={(e) =>
                setField("brandVoice", {
                  ...profile.brandVoice,
                  targetAudience: e.target.value,
                })
              }
            />
          </Field>
          <Field label="Competitors">
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={profile.brandVoice?.competitors ?? ""}
              onChange={(e) =>
                setField("brandVoice", {
                  ...profile.brandVoice,
                  competitors: e.target.value,
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Digital Twin™ — live signals</h3>
        <p className="mt-1 text-sm text-slate-400">
          Read-only metrics aggregated from apps and connectors. Updates as your business operates.
        </p>
        <div className="mt-4">
          <TwinPanel context={context} />
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
        <div className="mt-4">
          <AiQuickActions />
        </div>
      </section>
    </div>
  );
}
