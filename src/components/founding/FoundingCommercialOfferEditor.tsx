"use client";

import { useEffect, useMemo, useState } from "react";
import type { NegotiatedCommercialOffer } from "@dg/platform-core";

type AppOption = {
  id: string;
  label: string;
};

const INDUSTRY_APP_OPTIONS: AppOption[] = [
  { id: "real-estate", label: "Real Estate" },
  { id: "property-management", label: "Property Management" },
  { id: "commercial", label: "Commercial" },
  { id: "accommodation", label: "Accommodation" },
  { id: "services", label: "Services" },
  { id: "finance", label: "Finance" },
];

const GROWTH_APP_OPTIONS: AppOption[] = [
  { id: "prospecting_pro", label: "Prospecting" },
  { id: "ai_visibility_pro", label: "AI Visibility" },
  { id: "seo_pro", label: "SEO" },
  { id: "automation_pro", label: "Automation" },
  { id: "analytics_pro", label: "Analytics" },
  { id: "social_pro", label: "Social" },
  { id: "voice_ai", label: "Voice AI" },
];

const LEGACY_GROWTH_APP_IDS: Record<string, string> = {
  prospecting: "prospecting_pro",
  "ai-visibility": "ai_visibility_pro",
  seo: "seo_pro",
  automation: "automation_pro",
  analytics: "analytics_pro",
  social: "social_pro",
  "ai-communications": "voice_ai",
};

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function normaliseGrowthApps(ids: string[]) {
  return [...new Set(ids.map((id) => LEGACY_GROWTH_APP_IDS[id] ?? id))];
}

function toggleAppSelection(selected: string[], id: string, checked: boolean) {
  if (checked) return selected.includes(id) ? selected : [...selected, id];
  return selected.filter((selectedId) => selectedId !== id);
}

function AppCheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  disabled,
}: {
  legend: string;
  options: AppOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const optionIds = options.map((option) => option.id);
  const allSelected = optionIds.length > 0 && optionIds.every((id) => selected.includes(id));

  return (
    <fieldset className="sm:col-span-2" disabled={disabled}>
      <legend className="text-xs text-slate-500">{legend}</legend>
      <div className="mt-1 grid gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm font-medium text-white hover:border-sky-500/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => onChange(event.target.checked ? optionIds : [])}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
          />
          All
        </label>
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) => onChange(toggleAppSelection(selected, option.id, event.target.checked))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FoundingCommercialOfferEditor({ opportunityId }: { opportunityId: string }) {
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);
  const [offer, setOffer] = useState<NegotiatedCommercialOffer | null>(null);
  const [label, setLabel] = useState("Founding 10 negotiated plan");
  const [amount, setAmount] = useState("");
  const [oneOffAmount, setOneOffAmount] = useState("");
  const [oneOffLabel, setOneOffLabel] = useState("Implementation & setup");
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [platformTier, setPlatformTier] = useState<"starter" | "professional" | "business">("professional");
  const [seats, setSeats] = useState("5");
  const [trialDays, setTrialDays] = useState("0");
  const [industryApps, setIndustryApps] = useState<string[]>([]);
  const [premiumApps, setPremiumApps] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/v1/founding/commercial-offer?opportunityId=${encodeURIComponent(opportunityId)}`);
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        setVisible(false);
        setStatus("idle");
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVisible(true);
        setStatus("error");
        setMessage(json.error?.message || "Could not load commercial offer.");
        return;
      }
      const next = (json.data?.offer ?? null) as NegotiatedCommercialOffer | null;
      setVisible(true);
      setLocked(Boolean(json.data?.locked));
      setOffer(next);
      if (next) {
        setLabel(next.label);
        setAmount(String(next.amountCents / 100));
        setOneOffAmount(next.oneOffAmountCents ? String(next.oneOffAmountCents / 100) : "");
        setOneOffLabel(next.oneOffLabel ?? "Implementation & setup");
        setCadence(next.cadence);
        setPlatformTier(next.platformTier);
        setSeats(String(next.seats ?? 1));
        setTrialDays(String(next.trialDays));
        setIndustryApps(next.industryApps);
        setPremiumApps(normaliseGrowthApps(next.premiumApps));
        setNotes(next.notes ?? "");
      }
      setStatus("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const amountCents = useMemo(() => Math.round(Number(amount || 0) * 100), [amount]);
  const oneOffAmountCents = useMemo(() => Math.round(Number(oneOffAmount || 0) * 100), [oneOffAmount]);

  async function save() {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/founding/commercial-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId,
        label,
        amountCents,
        oneOffAmountCents,
        oneOffLabel,
        cadence,
        platformTier,
        seats: Number(seats),
        trialDays: Number(trialDays),
        industryApps,
        premiumApps,
        notes,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not save commercial offer.");
      if (res.status === 409) setLocked(true);
      return;
    }
    setOffer(json.data.offer);
    setStatus("saved");
    setMessage("Commercial offer saved. The customer agreement will use these exact terms.");
  }

  if (!visible) return null;

  return (
    <section className="mt-5 space-y-4 border-t border-slate-800 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Commercial offer</h3>
          <p className="mt-1 text-xs text-slate-400">
            Set negotiated recurring and one-off terms before the customer signs. These terms are copied to their organisation and snapshotted at signature.
          </p>
        </div>
        {offer ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
            {money(offer.amountCents)}/{offer.cadence === "annual" ? "yr" : "mo"}
            {offer.oneOffAmountCents ? ` + ${money(offer.oneOffAmountCents)} once` : ""}
          </span>
        ) : null}
      </div>

      {status === "loading" ? <p className="text-sm text-slate-500">Loading offer…</p> : null}
      {locked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Commercial terms are locked because the agreement has already been signed.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500 sm:col-span-2">Offer name<input value={label} onChange={(e) => setLabel(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Recurring price (AUD)<input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} placeholder="1497" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Billing cadence<select value={cadence} onChange={(e) => setCadence(e.target.value as "monthly" | "annual")} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
        <label className="text-xs text-slate-500">One-off fee (AUD, optional)<input type="number" min="0" step="1" value={oneOffAmount} onChange={(e) => setOneOffAmount(e.target.value)} disabled={locked} placeholder="0" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">One-off fee description<input value={oneOffLabel} onChange={(e) => setOneOffLabel(e.target.value)} disabled={locked || oneOffAmountCents <= 0} placeholder="Implementation & setup" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Entitlement tier<select value={platformTier} onChange={(e) => setPlatformTier(e.target.value as "starter" | "professional" | "business")} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"><option value="starter">Starter</option><option value="professional">Growth</option><option value="business">Scale</option></select></label>
        <label className="text-xs text-slate-500">Included seats<input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Trial days<input type="number" min="0" max="90" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <AppCheckboxGroup legend="Industry Apps" options={INDUSTRY_APP_OPTIONS} selected={industryApps} onChange={setIndustryApps} disabled={locked} />
        <AppCheckboxGroup legend="Growth Apps" options={GROWTH_APP_OPTIONS} selected={premiumApps} onChange={setPremiumApps} disabled={locked} />
        <label className="text-xs text-slate-500 sm:col-span-2">Commercial notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={locked || status === "saving" || !label.trim() || amountCents <= 0 || oneOffAmountCents < 0 || (oneOffAmountCents > 0 && !oneOffLabel.trim())} onClick={() => void save()} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
          {status === "saving" ? "Saving…" : offer ? "Update commercial offer" : "Save commercial offer"}
        </button>
        {message ? <p className={`text-sm ${status === "error" ? "text-amber-300" : "text-emerald-300"}`}>{message}</p> : null}
      </div>
    </section>
  );
}
