"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const TIMELINES = [
  { value: "immediate", label: "Now" },
  { value: "1_3_months", label: "3 months" },
  { value: "3_6_months", label: "6 months" },
  { value: "6_plus_months", label: "Just looking" },
] as const;

const TRANSACTIONS = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "invest", label: "Invest" },
] as const;

const fieldClass =
  "wantd-input w-full rounded-xl px-4 py-3 text-[var(--wantd-ink)] placeholder:text-[var(--wantd-ink-muted)]";

function WantdPropertyWantFormFields() {
  const q = useSearchParams().get("q")?.trim() || "";
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
      <div className="rounded-2xl border border-[var(--wantd-border)] bg-[var(--wantd-antique)] px-6 py-10 text-center">
        <p className="wantd-display text-2xl font-semibold text-[var(--wantd-black)]">
          Got it. We&apos;re on it.
        </p>
        <p className="wantd-muted mt-3 text-sm">
          We&apos;re looking for matches. We&apos;ll be in touch when something fits.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">
          What are you looking for?
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRANSACTIONS.map((t) => (
            <label
              key={t.value}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--wantd-border)] bg-[var(--wantd-antique)] px-4 py-2 text-sm text-[var(--wantd-ink)] has-[:checked]:border-[var(--wantd-black)] has-[:checked]:bg-[var(--wantd-gold)]"
            >
              <input
                type="radio"
                name="transaction"
                value={t.value}
                defaultChecked={t.value === "buy"}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">Where?</legend>
        <input
          name="preferredSuburbs"
          placeholder="Suburb or region"
          className={fieldClass}
        />
        <input name="preferredRegions" type="hidden" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">
          What&apos;s your budget?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="minBudgetAud"
            inputMode="decimal"
            placeholder="From"
            className={fieldClass}
          />
          <input
            name="maxBudgetAud"
            inputMode="decimal"
            placeholder="Up to"
            className={fieldClass}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">
          What matters most?
        </legend>
        <input
          name="propertyType"
          placeholder="House, acreage, apartment…"
          className={fieldClass}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="bedrooms"
            inputMode="numeric"
            placeholder="Bedrooms"
            className={fieldClass}
          />
          <input
            name="bathrooms"
            inputMode="numeric"
            placeholder="Bathrooms"
            className={fieldClass}
          />
          <input
            name="minLandSizeSqm"
            inputMode="numeric"
            placeholder="Land (sqm)"
            className={fieldClass}
          />
        </div>
        <input
          name="mustHaves"
          placeholder="Pool, privacy, views…"
          className={fieldClass}
        />
        <textarea
          name="description"
          rows={4}
          defaultValue={q}
          placeholder="Tell us what you want…"
          className={fieldClass}
        />
        <input name="lifestyle" type="hidden" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">How soon?</legend>
        <div className="flex flex-wrap gap-2">
          {TIMELINES.map((t) => (
            <label
              key={t.value}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--wantd-border)] bg-[var(--wantd-antique)] px-4 py-2 text-sm has-[:checked]:border-[var(--wantd-black)] has-[:checked]:bg-[var(--wantd-gold)]"
            >
              <input
                type="radio"
                name="timeline"
                value={t.value}
                defaultChecked={t.value === "1_3_months"}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--wantd-ink)]">
          How do we reach you?
        </legend>
        <input name="name" required placeholder="Your name" className={fieldClass} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="email" type="email" placeholder="Email" className={fieldClass} />
          <input name="phone" type="tel" placeholder="Phone" className={fieldClass} />
        </div>
        <p className="wantd-muted text-xs">Email or phone — either works.</p>
      </fieldset>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="wantd-btn-wanted min-h-12 w-full rounded-full px-4 py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Sending…" : "Find it"}
      </button>
    </form>
  );
}

export function WantdPropertyWantForm() {
  return (
    <Suspense fallback={<p className="wantd-muted text-sm">Loading…</p>}>
      <WantdPropertyWantFormFields />
    </Suspense>
  );
}
