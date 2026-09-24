"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomCommercialOffer } from "@dg/platform-core";

type AppOption = {
  id: string;
  label: string;
  description?: string;
  parentId?: string;
};

type AppOptions = {
  industry: AppOption[];
  templates: AppOption[];
  growth: AppOption[];
};

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function toggleAppSelection(selected: string[], id: string, checked: boolean) {
  if (checked) return selected.includes(id) ? selected : [...selected, id];
  return selected.filter((selectedId) => selectedId !== id);
}

function toggleAllAppSelections(selected: string[], optionIds: string[], checked: boolean) {
  const optionIdSet = new Set(optionIds);
  if (checked) return [...new Set([...selected, ...optionIds])];
  return selected.filter((id) => !optionIdSet.has(id));
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
  const optionIdSet = new Set(optionIds);
  const allSelected = optionIds.length > 0 && optionIds.every((id) => selected.includes(id));
  const retainedIds = selected.filter((id) => !optionIdSet.has(id));

  return (
    <fieldset className="sm:col-span-2" disabled={disabled}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-xs text-slate-500">{legend}</legend>
        <span className="text-[11px] text-slate-600">
          {selected.length} included
        </span>
      </div>
      <div className="mt-1 grid gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-sm font-semibold text-white hover:border-sky-400/60 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) =>
              onChange(toggleAllAppSelections(selected, optionIds, event.target.checked))
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
          />
          <span>
            All {legend}
            <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
              Include every currently available app in this group.
            </span>
          </span>
        </label>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                onChange(toggleAppSelection(selected, option.id, event.target.checked))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
            />
            <span>
              <span className="font-medium text-white">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {retainedIds.length > 0 ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Existing legacy/other inclusions retained: {retainedIds.join(", ")}.
        </p>
      ) : null}
    </fieldset>
  );
}

export function CustomCommercialOfferEditor({ opportunityId }: { opportunityId: string }) {
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);
  const [offer, setOffer] = useState<CustomCommercialOffer | null>(null);
  const [appOptions, setAppOptions] = useState<AppOptions>({ industry: [], templates: [], growth: [] });
  const [label, setLabel] = useState("Custom DigitalGate plan");
  const [amount, setAmount] = useState("");
  const [oneOffAmount, setOneOffAmount] = useState("");
  const [oneOffLabel, setOneOffLabel] = useState("Implementation & setup");
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [platformTier, setPlatformTier] = useState<"starter" | "professional" | "business">("professional");
  const [supportPlan, setSupportPlan] = useState<"standard" | "priority" | "success_partner" | "enterprise_success">("standard");
  const [seats, setSeats] = useState("5");
  const [trialDays, setTrialDays] = useState("14");
  const [industryApps, setIndustryApps] = useState<string[]>([]);
  const [industryTemplates, setIndustryTemplates] = useState<string[]>([]);
  const [premiumApps, setPremiumApps] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/v1/billing/custom-offer?opportunityId=${encodeURIComponent(opportunityId)}`);
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
        setMessage(json.error?.message || "Could not load custom pricing offer.");
        return;
      }
      const next = (json.data?.offer ?? null) as CustomCommercialOffer | null;
      const nextAppOptions = json.data?.appOptions as AppOptions | undefined;
      setVisible(true);
      setLocked(Boolean(json.data?.locked));
      setClaimedAt(typeof json.data?.claimedAt === "string" ? json.data.claimedAt : null);
      setOffer(next);
      setShareUrl(typeof json.data?.shareUrl === "string" ? json.data.shareUrl : null);
      if (nextAppOptions) setAppOptions(nextAppOptions);
      if (next) {
        setLabel(next.label);
        setAmount(String(next.amountCents / 100));
        setOneOffAmount(next.oneOffAmountCents ? String(next.oneOffAmountCents / 100) : "");
        setOneOffLabel(next.oneOffLabel ?? "Implementation & setup");
        setCadence(next.cadence);
        setPlatformTier(next.platformTier);
        setSupportPlan(next.supportPlan ?? "standard");
        setSeats(String(next.seats ?? 1));
        setTrialDays(String(next.trialDays));
        setIndustryApps(next.industryApps);
        setIndustryTemplates(next.industryTemplates ?? []);
        setPremiumApps(next.premiumApps);
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
  const templateParent = useMemo(
    () => new Map(appOptions.templates.map((option) => [option.id, option.parentId] as const)),
    [appOptions.templates],
  );
  const visibleTemplates = useMemo(
    () => appOptions.templates.filter((option) => !option.parentId || industryApps.includes(option.parentId)),
    [appOptions.templates, industryApps],
  );

  function setParentIndustries(next: string[]) {
    setIndustryApps(next);
    const allowed = new Set(next);
    setIndustryTemplates((current) =>
      current.filter((id) => {
        const parentId = templateParent.get(id);
        return !parentId || allowed.has(parentId);
      }),
    );
  }

  async function save() {
    setStatus("saving");
    setMessage("");
    const res = await fetch("/api/v1/billing/custom-offer", {
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
        supportPlan,
        seats: Number(seats),
        trialDays: Number(trialDays),
        industryApps,
        industryTemplates,
        premiumApps,
        notes,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(json.error?.message || "Could not save custom pricing offer.");
      if (res.status === 409) setLocked(true);
      return;
    }
    setOffer(json.data.offer);
    setShareUrl(typeof json.data?.shareUrl === "string" ? json.data.shareUrl : null);
    setStatus("saved");
    setMessage("Custom pricing offer saved. Review it, then send the private link to the customer.");
  }

  if (!visible) return null;

  return (
    <section className="mt-5 space-y-4 border-t border-slate-800 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Custom pricing offer</h3>
          <p className="mt-1 text-xs text-slate-400">
            Build a bespoke commercial package for any prospect or customer. The package becomes authoritative only when the customer accepts the private link.
          </p>
        </div>
        {offer ? (
          <span className={`rounded-full border px-2.5 py-1 text-xs ${locked ? "border-violet-500/30 bg-violet-500/10 text-violet-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
            {locked ? "Accepted · locked" : `${money(offer.amountCents)}/${offer.cadence === "annual" ? "yr" : "mo"}${offer.oneOffAmountCents ? ` + ${money(offer.oneOffAmountCents)} once` : ""}`}
          </span>
        ) : null}
      </div>

      {status === "loading" ? <p className="text-sm text-slate-500">Loading offer…</p> : null}
      {locked ? (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm text-violet-100">
          <p className="font-semibold">Customer accepted this offer.</p>
          <p className="mt-1 text-xs text-violet-100/60">
            Commercial terms are now locked to protect the accepted customer agreement{claimedAt ? ` · accepted ${new Date(claimedAt).toLocaleString("en-AU")}` : ""}.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500 sm:col-span-2">Offer name<input value={label} onChange={(e) => setLabel(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Recurring price (AUD)<input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={locked} placeholder="1497" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Billing cadence<select value={cadence} onChange={(e) => setCadence(e.target.value as "monthly" | "annual")} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
        <label className="text-xs text-slate-500">One-off fee (AUD, optional)<input type="number" min="0" step="1" value={oneOffAmount} onChange={(e) => setOneOffAmount(e.target.value)} disabled={locked} placeholder="0" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">One-off fee description<input value={oneOffLabel} onChange={(e) => setOneOffLabel(e.target.value)} disabled={locked || oneOffAmountCents <= 0} placeholder="Implementation & setup" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Entitlement tier<select value={platformTier} onChange={(e) => setPlatformTier(e.target.value as "starter" | "professional" | "business")} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"><option value="starter">Starter</option><option value="professional">Growth</option><option value="business">Scale</option></select></label>
        <label className="text-xs text-slate-500">Support plan<select value={supportPlan} onChange={(e) => setSupportPlan(e.target.value as typeof supportPlan)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"><option value="standard">Standard — included</option><option value="priority">Priority — $199/mo</option><option value="success_partner">Success Partner — $499/mo</option><option value="enterprise_success">Enterprise Success — custom</option></select></label>
        <label className="text-xs text-slate-500">Included seats<input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <label className="text-xs text-slate-500">Trial days<input type="number" min="0" max="90" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
        <AppCheckboxGroup legend="Industry Apps" options={appOptions.industry} selected={industryApps} onChange={setParentIndustries} disabled={locked} />
        <AppCheckboxGroup legend="Business types" options={visibleTemplates} selected={industryTemplates} onChange={setIndustryTemplates} disabled={locked} />
        <AppCheckboxGroup legend="Growth Apps" options={appOptions.growth} selected={premiumApps} onChange={setPremiumApps} disabled={locked} />
        <label className="text-xs text-slate-500 sm:col-span-2">Commercial notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={locked} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60" /></label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={locked || status === "saving" || !label.trim() || amountCents <= 0 || oneOffAmountCents < 0 || (oneOffAmountCents > 0 && !oneOffLabel.trim())} onClick={() => void save()} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
          {status === "saving" ? "Saving…" : offer ? "Update custom pricing offer" : "Save custom pricing offer"}
        </button>
        {shareUrl && !locked ? <button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => setMessage("Private customer offer link copied."))} className="rounded-lg border border-violet-500/40 px-4 py-2 text-sm font-semibold text-violet-200 hover:border-violet-400">Copy private offer link</button> : null}
        {message ? <p className={`text-sm ${status === "error" ? "text-amber-300" : "text-emerald-300"}`}>{message}</p> : null}
      </div>
    </section>
  );
}
