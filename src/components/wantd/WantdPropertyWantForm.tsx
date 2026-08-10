"use client";

import { useState } from "react";

const TIMELINES = [
  { value: "immediate", label: "Immediately" },
  { value: "1_3_months", label: "1–3 months" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "6_plus_months", label: "6+ months" },
] as const;

const TRANSACTIONS = [
  { value: "buy", label: "Buy" },
  { value: "invest", label: "Invest" },
  { value: "rent", label: "Rent" },
] as const;

export function WantdPropertyWantForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? "") || undefined,
      phone: String(fd.get("phone") ?? "") || undefined,
      transaction: String(fd.get("transaction") ?? "buy"),
      timeline: String(fd.get("timeline") ?? "1_3_months"),
      propertyType: String(fd.get("propertyType") ?? "") || undefined,
      preferredSuburbs: String(fd.get("preferredSuburbs") ?? "") || undefined,
      preferredRegions: String(fd.get("preferredRegions") ?? "") || undefined,
      minBudgetAud: String(fd.get("minBudgetAud") ?? "") || undefined,
      maxBudgetAud: String(fd.get("maxBudgetAud") ?? "") || undefined,
      bedrooms: String(fd.get("bedrooms") ?? "") || undefined,
      bathrooms: String(fd.get("bathrooms") ?? "") || undefined,
      minLandSizeSqm: String(fd.get("minLandSizeSqm") ?? "") || undefined,
      mustHaves: String(fd.get("mustHaves") ?? "") || undefined,
      lifestyle: String(fd.get("lifestyle") ?? "") || undefined,
      description: String(fd.get("description") ?? "") || undefined,
      source: "wantd_property_form",
    };

    const res = await fetch("/api/v1/wantd/property-want", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not submit your Want");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-white">We have your Want</p>
        <p className="mt-2 text-sm text-slate-300">
          Thanks — Wantd will match relevant supply and be in touch. Matching is curated for this
          MVP; you will hear from us when there is a fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          About you
        </legend>
        <input
          name="name"
          required
          placeholder="Full name"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </div>
        <p className="text-xs text-slate-500">Email or phone required.</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          Transaction
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRANSACTIONS.map((t) => (
            <label
              key={t.value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/10"
            >
              <input
                type="radio"
                name="transaction"
                value={t.value}
                defaultChecked={t.value === "buy"}
                className="accent-amber-400"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          Property
        </legend>
        <input
          name="propertyType"
          placeholder="Property type (e.g. Acreage, House, Townhouse)"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <input
          name="preferredSuburbs"
          placeholder="Preferred suburbs (comma-separated)"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <input
          name="preferredRegions"
          placeholder="Preferred regions (comma-separated)"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="minBudgetAud"
            inputMode="decimal"
            placeholder="Min budget (AUD)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
          <input
            name="maxBudgetAud"
            inputMode="decimal"
            placeholder="Max budget (AUD)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="bedrooms"
            inputMode="numeric"
            placeholder="Bedrooms"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
          <input
            name="bathrooms"
            inputMode="numeric"
            placeholder="Bathrooms"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
          <input
            name="minLandSizeSqm"
            inputMode="numeric"
            placeholder="Min land (sqm)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          Requirements
        </legend>
        <input
          name="mustHaves"
          placeholder="Must-haves (pool, privacy, views…)"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <input
          name="lifestyle"
          placeholder="Lifestyle requirements"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <textarea
          name="description"
          rows={4}
          placeholder="Tell us what you want in your own words"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500"
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-amber-200/90">
          Timing
        </legend>
        <select
          name="timeline"
          defaultValue="1_3_months"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
        >
          {TIMELINES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </fieldset>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Tell us what property you want"}
      </button>
    </form>
  );
}
